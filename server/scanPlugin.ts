import { loadEnv, type Plugin, type Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";

// Populated from .env (or the shell) when the dev server starts. Vite does not
// inject non-VITE_ vars into the middleware's process.env, so we load it here.
let apiKey: string | undefined;

/**
 * Dev-server endpoint for the "add by photo / link" scanner.
 *
 * Runs as Vite middleware so the Anthropic API key stays server-side (never in
 * the client bundle). For a deployed PWA, port this same logic to a serverless
 * function at the same /api/scan path.
 *
 * Auth: `new Anthropic()` resolves credentials from ANTHROPIC_API_KEY (or an
 * `ant auth login` profile). If none are configured the call throws and the
 * client falls back to manual entry.
 */

const MODEL = "claude-opus-4-8";

// Structured-output schema — the model is constrained to return exactly this.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "servingGrams", "servingsPerContainer", "density", "costPerGram"],
  properties: {
    name: { type: "string" },
    servingGrams: { type: "number" },
    servingsPerContainer: { type: ["number", "null"] },
    density: { type: ["number", "null"] },
    costPerGram: { type: ["number", "null"] },
  },
} as const;

const INSTRUCTIONS = `You are extracting data for a supplement-mixing app from a Supplement Facts label (or a product page).

Return these fields:
- name: the supplement/product name, concise.
- servingGrams: grams in ONE serving. Convert from mg (÷1000). If the serving is stated in capsules/scoops with a total gram weight, use that weight. If only a volume is given, estimate from the powder type.
- servingsPerContainer: servings per container if shown, else null.
- density: your best estimate of grams per LEVEL US teaspoon for this powder. Typical fine powders are ~2-3 g/tsp; dense minerals/salts higher (~4-5); light leafy/fiber/greens powders lower (~1.5-2). If you truly cannot guess, use null.
- costPerGram: only if a total price is available AND servingsPerContainer AND servingGrams are known: price / (servingsPerContainer * servingGrams). Otherwise null.

Use null for anything you cannot determine. Do not invent numbers.`;

function client(): Anthropic {
  if (!apiKey) {
    throw new Error(
      "No ANTHROPIC_API_KEY. Add it to a .env file (see .env.example) and restart the dev server."
    );
  }
  return new Anthropic({ apiKey });
}

async function extract(content: Anthropic.MessageParam["content"]): Promise<unknown> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content }],
  });
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block in response");
  return JSON.parse(text.text);
}

function parseDataUrl(dataUrl: string): { media_type: string; data: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error("expected a base64 data URL");
  return { media_type: m[1], data: m[2] };
}

async function scanImage(dataUrl: string): Promise<unknown> {
  const { media_type, data } = parseDataUrl(dataUrl);
  return extract([
    {
      type: "image",
      source: { type: "base64", media_type: media_type as "image/jpeg", data },
    },
    { type: "text", text: INSTRUCTIONS },
  ]);
}

async function scanUrl(url: string): Promise<unknown> {
  // Best-effort page fetch. Amazon aggressively blocks bots, so this may return
  // a captcha/robot page; when the extraction yields nothing useful the client
  // falls back to manual review. A production version would drive a headless
  // browser or use a product-data API.
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await resp.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 12000);
  return extract([
    {
      type: "text",
      text: `Product page URL: ${url}\n\nExtracted page text:\n${text}\n\n${INSTRUCTIONS}`,
    },
  ]);
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 20_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function scanApiPlugin(): Plugin {
  return {
    name: "supplement-scan-api",
    config(_userConfig, { mode }) {
      // Load ALL env vars (prefix "") from .env files so the server can read
      // ANTHROPIC_API_KEY. Falls back to the shell environment.
      const env = loadEnv(mode, process.cwd(), "");
      apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    },
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (req, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("method not allowed");
          return;
        }
        res.setHeader("content-type", "application/json");
        try {
          const body = await readJson(req);
          const data =
            body.kind === "image"
              ? await scanImage(String(body.image))
              : await scanUrl(String(body.url));
          res.end(JSON.stringify(data));
        } catch (err) {
          // Surface as a 502 so the client treats it as "not connected" and
          // falls back to manual entry rather than crashing.
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }));
        }
      };
      server.middlewares.use("/api/scan", handler);
    },
  };
}

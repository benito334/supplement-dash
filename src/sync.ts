import type { Backup } from "./store";

/**
 * No-script Google Sheet sync — same pattern as the All-Weather Scoreboard's
 * class board: write via a Google Form submission (fire-and-forget, works
 * around CORS since Forms don't need to be read from), read via the sheet's
 * "Publish to web" CSV export. Forms only ever APPEND a row, so every Save
 * adds a new row; on load we read the CSV and take the most recent (last) row.
 */

export interface SheetConfig {
  formAction: string; // https://docs.google.com/forms/d/e/<id>/formResponse
  entryField: string; // entry.XXXXXXX
  csvUrl: string; // published-to-web CSV url
}

/** Parse a "Get pre-filled link" URL into the form's submit endpoint + field id. */
export function parseFormLink(link: string): { formAction: string; entryField: string } {
  const idMatch = /\/forms\/d\/e\/([^/]+)\//.exec(link);
  if (!idMatch) {
    throw new Error(
      "That doesn't look like a Google Form link. Use the 'Get pre-filled link' URL (docs.google.com/forms/d/e/…)."
    );
  }
  const entryMatch = /entry\.(\d+)=/.exec(link);
  if (!entryMatch) {
    throw new Error(
      "No entry.XXXXX field found in that link. Make sure you filled in the answer before copying the pre-filled link."
    );
  }
  return {
    formAction: `https://docs.google.com/forms/d/e/${idMatch[1]}/formResponse`,
    entryField: `entry.${entryMatch[1]}`,
  };
}

function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function b64decode(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** RFC4180-ish CSV line splitter — handles quoted fields and doubled-quote escapes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Submit the current state as a new row. Fire-and-forget (no-cors → can't read the response). */
export async function pushRow(config: SheetConfig, data: Backup): Promise<void> {
  const body = new FormData();
  body.append(config.entryField, b64encode(JSON.stringify(data)));
  await fetch(config.formAction, { method: "POST", mode: "no-cors", body });
}

/** Read the CSV and return the most recent (last) row's payload, or null if there isn't one yet. */
export async function fetchLatestRow(csvUrl: string): Promise<{ data: Backup; savedAt: string } | null> {
  const bust = csvUrl + (csvUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
  const res = await fetch(bust);
  if (!res.ok) throw new Error("Couldn't load the sheet (HTTP " + res.status + ")");
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length <= 1) return null; // header only, or empty

  // Scan from the bottom; skip any malformed trailing rows.
  for (let i = lines.length - 1; i >= 1; i--) {
    const cols = parseCsvLine(lines[i]);
    const payload = cols[cols.length - 1];
    if (!payload) continue;
    try {
      const data = JSON.parse(b64decode(payload)) as Backup;
      if (Array.isArray(data.ingredients) && Array.isArray(data.recipes)) {
        return { data, savedAt: cols[0] };
      }
    } catch {
      // malformed row — keep scanning backwards
    }
  }
  return null;
}

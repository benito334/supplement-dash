# Sync your mixes across devices — no script, just a Form + a Sheet

Same idea as the "class board" pattern: a Google **Form** appends a row every
time you hit Save, and the app reads the sheet's **published CSV** to find the
most recent one. No Apps Script, nothing to deploy or authorize.

One-time setup, ~5 minutes.

## 1. Create the Form

1. Go to <https://forms.new>.
2. Add **exactly one question**. Set its type to **Paragraph** (not "Short
   answer" — your data is long). Title it anything, e.g. "data".
3. Click the **⋮** (three-dot) menu at the top right → **Get pre-filled
   link**.
4. Type anything into the question field (e.g. "test") → **Get link** →
   **Copy link**. Keep this link — it's your **pre-filled form link**.

## 2. Link the Form to a Sheet

1. Back in the Form editor, open the **Responses** tab.
2. Click the green Sheets icon → **Create a new spreadsheet**.
3. In that new spreadsheet: **File → Share → Publish to web**.
4. Under "Link", pick the **Form Responses** sheet/tab and format **CSV**.
5. Click **Publish**, confirm, then copy the link — that's your **published
   CSV link**.

## 3. Connect the app

1. Open the app → tap **Sync** → paste the **pre-filled form link** and the
   **published CSV link** → **Connect**.
2. Do this on your main device (the one with your real mix) first — it seeds
   the sheet. Connect any other device the same way afterward.

From then on: **Save** appends your current mix as a new row; opening the app
pulls the newest row and uses it.

## Things to know

- **A few minutes of lag.** Google caches the published CSV, so a save on one
  device may take a couple of minutes to show up on another. Use **Pull
  latest** in the Sync screen to check sooner.
- **The sheet grows.** Every Save adds a row — nothing is deleted
  automatically. That's fine; only the last row is ever read. Delete old rows
  by hand from the sheet whenever you feel like tidying up.
- **The two links act like a shared key.** Anyone who has both can read and
  add entries to your sheet. Don't post them publicly.
- **One question only.** If the Form has more than one question, the entry ID
  the app grabbed might be the wrong one — keep it to a single "data" question.

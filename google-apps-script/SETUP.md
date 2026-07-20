# Sync your mixes across devices with a Google Sheet

This is a one-time, ~5-minute setup. After it, every device that has the app
open stays in sync through your sheet.

## 1. Create the sheet + script

1. Go to <https://sheets.new> to make a new Google Sheet. Name it anything
   (e.g. "Supplement Dash data").
2. In the sheet, click **Extensions → Apps Script**.
3. Delete whatever is in the editor, paste the entire contents of
   [`Code.gs`](./Code.gs), and click the **Save** icon.

## 2. Deploy it as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon → choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** **Anyone**  ← important (this allows the site to reach it)
4. Click **Deploy**, then **Authorize access** and approve the permissions
   (it's your own script accessing your own sheet).
5. Copy the **Web app URL** — it ends in `/exec`.

> Treat that URL like a password. Anyone who has it can read and write your
> sheet. Don't post it publicly.

## 3. Connect the app

1. Open the app, tap **Sync**, and paste the URL into **Google Sheet sync**.
2. Tap **Connect**. Your current mix uploads to the sheet.
3. On any other device, open the app, tap **Sync**, paste the **same** URL, and
   tap **Connect** — it pulls your mix down.

Tip: connect your main device (the one with your real mix) **first**, so it
populates the sheet before other devices pull from it.

## Updating the script later

If you ever change `Code.gs`, redeploy: **Deploy → Manage deployments →** (edit,
the pencil) **→ Version: New version → Deploy**. The URL stays the same.

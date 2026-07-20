/**
 * Supplement Dash — Google Sheet sync backend.
 *
 * Paste this into a Google Sheet's Apps Script editor (Extensions → Apps Script),
 * then deploy as a Web App (see SETUP.md). It stores the whole app state as one
 * JSON string in cell A1 of a "data" sheet.
 *
 * GET  → returns the stored JSON (or empty string).
 * POST → overwrites the stored JSON with the request body, then returns it.
 */

const SHEET_NAME = 'data';
const CELL = 'A1';

function doGet() {
  return read_();
}

function doPost(e) {
  var body = e && e.postData ? e.postData.contents : '';
  if (body) {
    getSheet_().getRange(CELL).setValue(body);
  }
  return read_();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Keep the cell as plain text so long JSON isn't mangled.
  sheet.getRange(CELL).setNumberFormat('@');
  return sheet;
}

function read_() {
  var val = getSheet_().getRange(CELL).getValue();
  return ContentService.createTextOutput(val ? String(val) : '').setMimeType(
    ContentService.MimeType.JSON
  );
}

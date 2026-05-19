/**
 * Year 8 Aural Skills Quiz — results receiver.
 *
 * SETUP (one time, ~5 minutes):
 *  1. Create a new Google Sheet. Note its URL.
 *  2. In that Sheet: Extensions → Apps Script.
 *  3. Delete any sample code, paste THIS whole file in, Save.
 *  4. Deploy → New deployment → type "Web app".
 *       - Description: Aural quiz
 *       - Execute as:  Me
 *       - Who has access:  Anyone
 *     Deploy, authorise when prompted, COPY the Web app URL.
 *  5. Paste that URL into CONFIG.scriptUrl in index.html.
 *
 * The Sheet auto-creates headers on the first submission.
 */

var SHEET_NAME = 'Results';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    if (sh.getLastRow() === 0) {
      sh.appendRow([
        'Received', 'Quiz ID', 'Name', 'Class', 'Score', 'Total',
        'Percent', 'Band', 'Report comment', 'Per-skill', 'Answers',
        'Student timestamp'
      ]);
      sh.setFrozenRows(1);
    }

    sh.appendRow([
      new Date(),
      data.quizId || '',
      data.name || '',
      data.cls || '',
      data.score, data.total, data.pct,
      data.band || '',
      data.report || '',
      JSON.stringify(data.perSkill || {}),
      data.answers || '',
      data.ts || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Aural Skills Quiz receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

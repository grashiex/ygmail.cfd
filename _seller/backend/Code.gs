/**
 * Private Webmail — Google Apps Script (Code.gs)
 * 1. Create a Google Sheet named "Inbox" with headers in row 1:
 *    id | to | from | subject | date | bodyText | bodyHtml
 * 2. Extensions → Apps Script → paste this file → Deploy → New deployment
 *    Type: Web app | Execute as: Me | Who has access: Anyone
 * 3. Copy the Web App URL into the frontend Settings.
 */

const SHEET_NAME = 'Inbox';

/** Copy of every new inbound email goes here (Option B). Leave '' to disable. */
const FORWARD_TO_GMAIL = 'glitterhost0@gmail.com';

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const params = method === 'GET'
      ? (e.parameter || {})
      : parseBody_(e);

    const action = (params.action || (method === 'GET' ? 'list' : 'ingest')).toLowerCase();

    if (action === 'list') {
      return json_({ ok: true, emails: listEmails_(params.to || '') });
    }
    if (action === 'delete') {
      deleteEmail_(params.id);
      return json_({ ok: true });
    }
    if (action === 'ingest' || action === 'receive') {
      const row = ingest_(params);
      return json_({ ok: true, id: row.id });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'to', 'from', 'subject', 'date', 'bodyText', 'bodyHtml']);
  }
  return sh;
}

function listEmails_(toFilter) {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[i][idx]; });
    obj.row = i + 1;
    if (!obj.id) obj.id = String(i);
    if (toFilter) {
      const needle = String(toFilter).toLowerCase();
      if (String(obj.to || '').toLowerCase().indexOf(needle) === -1) continue;
    }
    rows.push(obj);
  }
  rows.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  return rows;
}

function ingest_(p) {
  const sh = sheet_();
  const id = p.id || Utilities.getUuid();
  const date = p.date || new Date().toISOString();
  const to = p.to || '';
  const from = p.from || '';
  const subject = p.subject || '';
  const bodyText = p.bodyText || p.body || '';
  const bodyHtml = p.bodyHtml || p.html || '';

  sh.appendRow([id, to, from, subject, date, bodyText, bodyHtml]);

  try {
    forwardCopy_({ to: to, from: from, subject: subject, bodyText: bodyText, bodyHtml: bodyHtml });
  } catch (err) {
    // Don't fail ingest if Gmail forward fails
    console.error('forwardCopy_ failed: ' + err);
  }

  return { id: id };
}

function forwardCopy_(mail) {
  if (!FORWARD_TO_GMAIL) return;

  const subj = '[ygmail] ' + (mail.subject || '(no subject)');
  const plain =
    'To: ' + (mail.to || '') + '\n' +
    'From: ' + (mail.from || '') + '\n' +
    'Subject: ' + (mail.subject || '') + '\n\n' +
    (mail.bodyText || '(see HTML body)');

  const opts = {
    name: 'ygmail.cfd',
    replyTo: mail.from || undefined,
  };
  if (mail.bodyHtml) {
    opts.htmlBody = mail.bodyHtml;
  }

  MailApp.sendEmail(FORWARD_TO_GMAIL, subj, plain, opts);
}

function deleteEmail_(id) {
  if (!id) throw new Error('Missing id');
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('Not found');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Backend code snippets shown in Settings (also in SETUP_GUIDE.md / backend/).
 */
window.SNIPPETS = {
  gas: `/**
 * Private Webmail — Google Apps Script (Code.gs)
 * Deploy as Web app → Anyone. See backend/Code.gs or SETUP_GUIDE.md
 */

const SHEET_NAME = 'Inbox';

function doGet(e) { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  try {
    const params = method === 'GET' ? (e.parameter || {}) : parseBody_(e);
    const action = (params.action || (method === 'GET' ? 'list' : 'ingest')).toLowerCase();
    if (action === 'list') return json_({ ok: true, emails: listEmails_(params.to || '') });
    if (action === 'delete') { deleteEmail_(params.id); return json_({ ok: true }); }
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
  try { return JSON.parse(e.postData.contents); } catch (err) { return {}; }
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
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  return rows;
}

function ingest_(p) {
  const sh = sheet_();
  const id = p.id || Utilities.getUuid();
  sh.appendRow([id, p.to || '', p.from || '', p.subject || '', p.date || new Date().toISOString(), p.bodyText || p.body || '', p.bodyHtml || p.html || '']);
  return { id };
}

function deleteEmail_(id) {
  if (!id) throw new Error('Missing id');
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sh.deleteRow(i + 1); return; }
  }
  throw new Error('Not found');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`,

  worker: `/**
 * Cloudflare Email Worker — set env GAS_WEBAPP_URL
 * Full file: backend/worker.js
 */

export default {
  async email(message, env) {
    const gasUrl = env.GAS_WEBAPP_URL;
    if (!gasUrl) { message.setReject('GAS_WEBAPP_URL not configured'); return; }

    const text = await new Response(message.raw).text();
    const payload = {
      action: 'ingest',
      id: crypto.randomUUID(),
      to: message.to || '',
      from: message.from || '',
      subject: message.headers.get('subject') || '(no subject)',
      date: new Date(message.headers.get('date') || Date.now()).toISOString(),
      bodyText: extractText_(text),
      bodyHtml: extractHtml_(text),
    };

    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) message.setReject('Upstream ingest failed: ' + res.status);
  },
};

function extractText_(raw) {
  const m = raw.match(/Content-Type:\\s*text\\/plain[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n--)/i);
  if (m) return decodeQuoted_(m[1]).trim();
  return raw.split(/\\r?\\n\\r?\\n/).slice(1).join('\\n').slice(0, 50000);
}

function extractHtml_(raw) {
  const m = raw.match(/Content-Type:\\s*text\\/html[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n--)/i);
  return m ? decodeQuoted_(m[1]).trim() : '';
}

function decodeQuoted_(s) {
  const unfolded = String(s || '').replace(/=\\r?\\n/g, '');
  const bytes = [];
  for (let i = 0; i < unfolded.length; ) {
    if (unfolded[i] === '=' && i + 2 < unfolded.length && /^[0-9A-Fa-f]{2}$/.test(unfolded.slice(i + 1, i + 3))) {
      bytes.push(parseInt(unfolded.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(unfolded.charCodeAt(i) & 0xff);
      i += 1;
    }
  }
  try { return new TextDecoder('utf-8').decode(Uint8Array.from(bytes)); }
  catch { return unfolded; }
}
`,
};

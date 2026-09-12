/**
 * Private Webmail — Google Apps Script (Code.gs)
 *
 * SETUP (once per buyer sheet):
 * 1. Paste this file → Save
 * 2. Run resetAuth (dropdown → resetAuth → ▶) → Allow
 * 3. Deploy → New deployment OR Manage deployments → ✏️ → New version → Deploy
 *    Execute as: Me | Who has access: Anyone
 * 4. Put /exec URL in Worker GAS_WEBAPP_URL only
 *
 * Unlock password  = shared with Person 1/2/3
 * Owner PIN        = buyer only (required to change unlock password)
 */
const SHEET_NAME = 'Inbox';
const CODE_VERSION = 'stable-v1';

/** Defaults after resetAuth — match js/config.js */
const DEFAULT_UNLOCK = 'grashiex123';
const DEFAULT_OWNER_PIN = 'grashiex-owner';

/** Leave empty — Gmail copy is via Worker FORWARD_TO */
const FORWARD_TO_GMAIL = '';

// ─── HTTP entry ───────────────────────────────────────────

function doGet(e) {
  return handle_(e, 'GET');
}

function doPost(e) {
  return handle_(e, 'POST');
}

function handle_(e, method) {
  try {
    var q = (e && e.parameter) || {};
    var b = method === 'GET' ? {} : parseBody_(e);
    var p = {};
    var k;
    for (k in q) p[k] = q[k];
    for (k in b) p[k] = b[k];

    var action = String(p.action || (method === 'GET' ? 'list' : 'ingest')).toLowerCase();

    if (action === 'ping' || action === 'version') {
      return out_({ ok: true, codeVersion: CODE_VERSION });
    }
    if (action === 'auth' || action === 'login' || action === 'verify') {
      return out_(auth_(p));
    }
    if (action === 'setpassword' || action === 'changepassword') {
      return out_(setPass_(p));
    }
    if (action === 'list') {
      return out_({
        ok: true,
        codeVersion: CODE_VERSION,
        sessionEpoch: epoch_(),
        emails: list_(p.to || ''),
      });
    }
    if (action === 'delete') {
      del_(p.id);
      return out_({ ok: true });
    }
    if (action === 'ingest' || action === 'receive') {
      var row = ingest_(p);
      return out_({ ok: true, id: row.id, forwarded: row.forwarded });
    }
    return out_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function parseBody_(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return {};
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ─── Auth (PropertiesService only — no UI) ────────────────

function props_() {
  return PropertiesService.getScriptProperties();
}

function sha_(text) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );
  var hex = '';
  var i;
  var v;
  for (i = 0; i < raw.length; i++) {
    v = raw[i];
    if (v < 0) v += 256;
    hex += (v < 16 ? '0' : '') + v.toString(16);
  }
  return hex;
}

function epoch_() {
  return props_().getProperty('sessionEpoch') || '0';
}

function bumpEpoch_() {
  props_().setProperty('sessionEpoch', String(Date.now()));
}

function unlockHash_() {
  return props_().getProperty('sitePasswordHash') || '';
}

function ownerHash_() {
  return props_().getProperty('ownerPinHash') || '';
}

function setUnlock_(password) {
  props_().setProperty('sitePasswordHash', sha_(password));
  bumpEpoch_();
}

function setOwner_(pin) {
  props_().setProperty('ownerPinHash', sha_(pin));
}

/**
 * RUN THIS after paste (▶ Run). No popup — check Execution log.
 * Sets unlock = grashiex123 , owner PIN = grashiex-owner
 */
function resetAuth() {
  setUnlock_(DEFAULT_UNLOCK);
  setOwner_(DEFAULT_OWNER_PIN);
  Logger.log('OK resetAuth');
  Logger.log('Unlock password: ' + DEFAULT_UNLOCK);
  Logger.log('Owner PIN: ' + DEFAULT_OWNER_PIN);
  Logger.log('Next: Deploy → Manage deployments → Edit (pencil) → New version → Deploy');
}

/** Same as resetAuth */
function resetSitePassword() {
  resetAuth();
}

function auth_(p) {
  var password = String(p.password || '');
  var bootstrap = String(p.bootstrap || '');
  if (!password) return { ok: false, error: 'Missing password' };

  var stored = unlockHash_();
  if (!stored) {
    if (!bootstrap || password !== bootstrap) {
      return { ok: false, error: 'Invalid password' };
    }
    setUnlock_(password);
    return {
      ok: true,
      codeVersion: CODE_VERSION,
      initialized: true,
      sessionEpoch: epoch_(),
    };
  }
  if (sha_(password) !== stored) {
    return { ok: false, error: 'Invalid password' };
  }
  return { ok: true, codeVersion: CODE_VERSION, sessionEpoch: epoch_() };
}

function checkOwner_(p) {
  var pin = String(p.ownerPin || '');
  var bootstrap = String(p.ownerBootstrap || '');
  if (!pin) return { ok: false, error: 'Owner PIN required' };

  var stored = ownerHash_();
  if (!stored) {
    if (!bootstrap || pin !== bootstrap) {
      return { ok: false, error: 'Owner PIN incorrect' };
    }
    setOwner_(pin);
    return { ok: true };
  }
  if (sha_(pin) !== stored) {
    return { ok: false, error: 'Owner PIN incorrect' };
  }
  return { ok: true };
}

/** Change unlock password — needs Owner PIN (buyer only). */
function setPass_(p) {
  var next = String(p.newPassword || '');
  if (next.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters' };
  }
  var owner = checkOwner_(p);
  if (!owner.ok) return owner;
  setUnlock_(next);
  return { ok: true, codeVersion: CODE_VERSION, sessionEpoch: epoch_() };
}

// ─── Sheet ────────────────────────────────────────────────

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open this script from the Google Sheet (Extensions → Apps Script)');
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow([
      'id',
      'to',
      'from',
      'subject',
      'date',
      'bodyText',
      'bodyHtml',
      'forwardStatus',
    ]);
  }
  return sh;
}

function list_(toFilter) {
  var sh = sheet_();
  var range = sh.getDataRange();
  var values = range.getValues();
  if (!values || values.length < 2) return [];

  var headers = values[0].map(String);
  var rows = [];
  var i;
  var obj;
  var h;
  var needle;

  for (i = 1; i < values.length; i++) {
    obj = {};
    for (h = 0; h < headers.length; h++) {
      obj[headers[h]] = values[i][h];
    }
    obj.row = i + 1;
    if (!obj.id) obj.id = String(i);
    if (toFilter) {
      needle = String(toFilter).toLowerCase();
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
  var sh = sheet_();
  var id = p.id || Utilities.getUuid();
  var date = p.date || new Date().toISOString();
  var to = p.to || '';
  var from = p.from || '';
  var subject = p.subject || '';
  var bodyText = p.bodyText || p.body || '';
  var bodyHtml = p.bodyHtml || p.html || '';
  var forwardStatus = '';

  try {
    forward_(to, from, subject, bodyText, bodyHtml);
    forwardStatus = FORWARD_TO_GMAIL ? 'sent' : 'skipped';
  } catch (err) {
    forwardStatus = 'error:' + String(err);
  }

  sh.appendRow([id, to, from, subject, date, bodyText, bodyHtml, forwardStatus]);
  return { id: id, forwarded: forwardStatus };
}

function del_(id) {
  if (!id) throw new Error('Missing id');
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  var i;
  for (i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('Not found');
}

function forward_(to, from, subject, bodyText, bodyHtml) {
  if (!FORWARD_TO_GMAIL) return;
  var subj = '[ygmail] ' + String(subject || '(no subject)').substring(0, 200);
  var plain =
    'To: ' +
    to +
    '\nFrom: ' +
    from +
    '\nSubject: ' +
    subject +
    '\n\n' +
    String(bodyText || '').substring(0, 15000);
  MailApp.sendEmail(FORWARD_TO_GMAIL, subj, plain);
}

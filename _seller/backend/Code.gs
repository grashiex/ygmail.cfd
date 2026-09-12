/**
 * Private Webmail — Google Apps Script (Code.gs)
 *
 * Deploy: Web app | Execute as: Me | Who has access: Anyone
 *
 * Gmail copy: set FORWARD_TO_GMAIL, then run testForwardGmail() once
 * from the editor (▶) and click Allow — otherwise copies will silently fail.
 */

const SHEET_NAME = 'Inbox';

/** Bump this when you paste — check /api?action=list for "codeVersion". */
const CODE_VERSION = 'auth-v2';

/** Prefer Worker env FORWARD_TO for Gmail copies. Leave '' here to avoid doubles. */
const FORWARD_TO_GMAIL = '';

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const queryParams = (e && e.parameter) || {};
    const bodyParams = method === 'GET' ? {} : parseBody_(e);
    // Body wins over query; both supported (Worker may pass action in URL)
    const params = Object.assign({}, queryParams, bodyParams);

    const action = String(
      params.action || (method === 'GET' ? 'list' : 'ingest')
    ).toLowerCase();

    if (action === 'auth' || action === 'login' || action === 'verify') {
      return json_(authPassword_(params));
    }
    if (action === 'setpassword' || action === 'changepassword') {
      return json_(setPassword_(params));
    }
    if (action === 'list') {
      sheet_();
      return json_({
        ok: true,
        codeVersion: CODE_VERSION,
        sessionEpoch: getSessionEpoch_(),
        forwardTo: FORWARD_TO_GMAIL || null,
        emails: listEmails_(params.to || ''),
      });
    }
    if (action === 'delete') {
      deleteEmail_(params.id);
      return json_({ ok: true });
    }
    if (action === 'ingest' || action === 'receive') {
      const row = ingest_(params);
      return json_({ ok: true, id: row.id, forwarded: row.forwarded });
    }
    return json_({ ok: false, error: 'Unknown action: ' + action });
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

/** SHA-256 hex of site password (shared across all devices). */
function hashPassword_(pw) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(pw || ''),
    Utilities.Charset.UTF_8
  );
  return raw
    .map(function (b) {
      const v = b < 0 ? b + 256 : b;
      return ('0' + v.toString(16)).slice(-2);
    })
    .join('');
}

function getStoredHash_() {
  return PropertiesService.getScriptProperties().getProperty('sitePasswordHash') || '';
}

function setStoredHash_(password) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('sitePasswordHash', hashPassword_(password));
  props.setProperty('sessionEpoch', String(Date.now()));
}

function getOwnerHash_() {
  return PropertiesService.getScriptProperties().getProperty('ownerPinHash') || '';
}

function setOwnerHash_(pin) {
  PropertiesService.getScriptProperties().setProperty(
    'ownerPinHash',
    hashPassword_(pin)
  );
}

function assertOwnerPin_(p) {
  const pin = String(p.ownerPin || p.ownerPassword || '');
  const bootstrap = String(p.ownerBootstrap || p.bootstrapOwner || '');
  if (!pin) return { ok: false, error: 'Owner PIN required' };

  const stored = getOwnerHash_();
  if (!stored) {
    if (!bootstrap || pin !== bootstrap) {
      return { ok: false, error: 'Owner PIN incorrect' };
    }
    setOwnerHash_(pin);
    return { ok: true };
  }
  if (hashPassword_(pin) !== stored) {
    return { ok: false, error: 'Owner PIN incorrect' };
  }
  return { ok: true };
}

function getSessionEpoch_() {
  return PropertiesService.getScriptProperties().getProperty('sessionEpoch') || '0';
}

/**
 * LOCKOUT RECOVERY — run in Apps Script editor (▶ Run), then Deploy New version.
 */
const RECOVERY_PASSWORD = 'grashiex123';
const RECOVERY_OWNER_PIN = 'grashiex-owner';

function resetSitePassword() {
  setStoredHash_(RECOVERY_PASSWORD);
  setOwnerHash_(RECOVERY_OWNER_PIN);
  Logger.log('Unlock password: ' + RECOVERY_PASSWORD);
  Logger.log('Owner PIN: ' + RECOVERY_OWNER_PIN);
  try {
    SpreadsheetApp.getUi().alert(
      'Reset OK.\n\nUnlock password: ' + RECOVERY_PASSWORD +
      '\nOwner PIN: ' + RECOVERY_OWNER_PIN +
      '\n\nDeploy → Manage deployments → pencil → New version → Deploy'
    );
  } catch (e) {}
}

/**
 * First login: bootstrap unlock password from config defaultPassword.
 */
function authPassword_(p) {
  const password = String(p.password || '');
  const bootstrap = String(p.bootstrap || '');
  if (!password) return { ok: false, error: 'Missing password' };

  const stored = getStoredHash_();
  if (!stored) {
    if (!bootstrap || password !== bootstrap) {
      return { ok: false, error: 'Invalid password' };
    }
    setStoredHash_(password);
    return { ok: true, codeVersion: CODE_VERSION, initialized: true, sessionEpoch: getSessionEpoch_() };
  }

  if (hashPassword_(password) !== stored) {
    return { ok: false, error: 'Invalid password' };
  }
  return { ok: true, codeVersion: CODE_VERSION, sessionEpoch: getSessionEpoch_() };
}

/**
 * Change unlock password — OWNER PIN required (not shared with Person 1/2/3).
 * After change, old unlock password dies on every device.
 */
function setPassword_(p) {
  const next = String(p.newPassword || '');
  if (next.length < 4) return { ok: false, error: 'Password must be at least 4 characters' };

  const owner = assertOwnerPin_(p);
  if (!owner.ok) return owner;

  setStoredHash_(next);
  return { ok: true, codeVersion: CODE_VERSION, sessionEpoch: getSessionEpoch_() };
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'to', 'from', 'subject', 'date', 'bodyText', 'bodyHtml', 'forwardStatus']);
  }
  ensureForwardCol_(sh);
  return sh;
}

function ensureForwardCol_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (headers.indexOf('forwardStatus') === -1) {
    sh.getRange(1, headers.length + 1).setValue('forwardStatus');
  }
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

  let forwardStatus = '';
  try {
    forwardCopy_({ to: to, from: from, subject: subject, bodyText: bodyText, bodyHtml: bodyHtml });
    forwardStatus = 'sent:' + new Date().toISOString();
  } catch (err) {
    forwardStatus = 'error:' + String(err);
  }

  sh.appendRow([id, to, from, subject, date, bodyText, bodyHtml, forwardStatus]);

  return { id: id, forwarded: forwardStatus };
}

/**
 * RUN ONCE after paste: dropdown → setupForwarding → ▶ Run → Allow.
 * Creates forwardStatus column + sends a test Gmail.
 */
function setupForwarding() {
  const sh = sheet_();
  ensureForwardCol_(sh);
  testForwardGmail();
  try {
    SpreadsheetApp.getUi().alert(
      'OK: forwardStatus column ready.\nTest email sent to ' +
        FORWARD_TO_GMAIL +
        '\n\nNEXT: Deploy → Manage deployments → pencil → New version → Deploy'
    );
  } catch (e) {
    Logger.log('setupForwarding done — now Deploy New version');
  }
}

function testForwardGmail() {
  if (!FORWARD_TO_GMAIL) {
    throw new Error('FORWARD_TO_GMAIL is empty');
  }
  forwardCopy_({
    to: 'test@ygmail.cfd',
    from: 'setup@ygmail.cfd',
    subject: 'ygmail forward test OK',
    bodyText: 'If you see this in Gmail (or Spam), forwarding works.',
    bodyHtml: '<p>If you see this in Gmail (or Spam), <b>forwarding works</b>.</p>',
  });
  Logger.log('Sent test to ' + FORWARD_TO_GMAIL);
}

function forwardCopy_(mail) {
  if (!FORWARD_TO_GMAIL) return;

  const subj = '[ygmail] ' + String(mail.subject || '(no subject)').substring(0, 200);
  const header =
    'To: ' + (mail.to || '') + '\n' +
    'From: ' + (mail.from || '') + '\n' +
    'Subject: ' + (mail.subject || '') + '\n\n';

  // Large HTML from Netflix/FB/etc. often breaks MailApp — keep forward small
  const plainBody = header + String(mail.bodyText || stripTags_(mail.bodyHtml) || '(empty)')
    .substring(0, 15000);

  const htmlSnippet = String(mail.bodyHtml || '')
    .substring(0, 35000);
  const html =
    '<pre style="font:13px sans-serif;white-space:pre-wrap">' +
    escapeHtml_(header) +
    '</pre><hr>' +
    (htmlSnippet
      ? htmlSnippet
      : '<pre style="white-space:pre-wrap">' + escapeHtml_(plainBody) + '</pre>');

  try {
    MailApp.sendEmail({
      to: FORWARD_TO_GMAIL,
      subject: subj,
      body: plainBody,
      htmlBody: html,
      name: 'ygmail.cfd',
    });
  } catch (err) {
    // Fallback: text-only (almost always works)
    MailApp.sendEmail(FORWARD_TO_GMAIL, subj, plainBody);
  }
}

function stripTags_(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

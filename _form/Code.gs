/**
 * The Handoff Desk request catcher (Sam Yusufi)
 *
 * When the request form on The Handoff Desk site is sent, this script:
 *   1. Adds a row to the "The Handoff Desk Requests" Google Sheet (created by setup()).
 *   2. Emails Sam the request. Replying goes straight to the agent who sent it.
 *
 * Deploy as a web app: Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * Then put the /exec URL into ENDPOINT at the top of the form script in index.html and redeploy the site.
 * Setup notes: _form/README.md
 */

var CFG = {
  NOTIFY_TO: 'sam@samyusufi.com',
  SHEET_TITLE: 'The Handoff Desk Requests',
  TAB: 'Requests',
  MIN_FILL_MS: 1500,   // forms sent faster than this are bots
  MAX_PER_HOUR: 40,    // safety valve against floods
  STATUSES: ['New', 'Replied', 'Quoted', 'Booked', 'Not a fit']
};
var HEADERS = ['Received', 'Services', 'Name', 'Email', 'Phone', 'Brokerage', 'Property city', 'Key date', 'Message', 'Page', 'Status', 'Notes'];

function doGet() {
  return reply_({ ok: true, service: 'The Handoff Desk requests' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var p = (e && e.parameter) || {};
    if (p.hp_url) return reply_({ ok: true });                                     // hidden field: only bots fill it
    var fillMs = Number(p.t || 0);
    if (fillMs && fillMs < CFG.MIN_FILL_MS) return reply_({ ok: true });           // too fast to be a person
    var cache = CacheService.getScriptCache();
    var id = clean_(p.id, 64);
    if (id && cache.get('id:' + id)) return reply_({ ok: true, duplicate: true }); // same request sent twice

    var r = {
      services: clean_(p.services, 200), name: clean_(p.name, 120), email: clean_(p.email, 200),
      phone: clean_(p.phone, 40), brokerage: clean_(p.brokerage, 160), city: clean_(p.city, 120),
      date: clean_(p.date, 120), message: clean_(p.message, 3000), page: clean_(p.page, 200)
    };
    if (!r.name) return reply_({ ok: false, error: 'name' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return reply_({ ok: false, error: 'email' });
    if (!underLimit_(cache)) return reply_({ ok: false, error: 'busy' });

    var sheet = sheet_();
    sheet.appendRow([new Date(), r.services, r.name, r.email, r.phone, r.brokerage, r.city, r.date, r.message, r.page, 'New', ''].map(safe_));
    notify_(r);
    if (id) cache.put('id:' + id, '1', 21600);
    return reply_({ ok: true });
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function notify_(r) {
  var subject = 'New Handoff Desk request: ' + r.name + (r.services ? ' (' + r.services + ')' : '');
  var lines = [
    'Services: ' + (r.services || 'Not specified'),
    'Name: ' + r.name,
    'Email: ' + r.email,
    'Phone: ' + (r.phone || '-'),
    'Brokerage: ' + (r.brokerage || '-'),
    'Property city: ' + (r.city || '-'),
    'Key date: ' + (r.date || '-'),
    '',
    'Message:',
    r.message || '-',
    '',
    'Sheet: ' + SpreadsheetApp.openById(prop_('SHEET_ID')).getUrl()
  ];
  MailApp.sendEmail({ to: CFG.NOTIFY_TO, replyTo: r.email, name: 'The Handoff Desk', subject: subject, body: lines.join('\n') });
}

// ---------- one-time setup and testing (run from the editor) ----------

function setup() {
  var ss = SpreadsheetApp.create(CFG.SHEET_TITLE);
  var sh = ss.getSheets()[0];
  sh.setName(CFG.TAB);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  var statusCol = HEADERS.indexOf('Status') + 1;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(CFG.STATUSES, true).build();
  sh.getRange(2, statusCol, 1000, 1).setDataValidation(rule);
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  console.log('Sheet ready: ' + ss.getUrl());
}

function sendTest() {
  var e = { parameter: { services: 'Listing coordination', name: 'Test Agent', email: CFG.NOTIFY_TO, phone: '925-000-0000',
    brokerage: 'Test Brokerage', city: 'Livermore', date: 'Next week', message: 'Test request from sendTest().', page: 'editor', t: '5000', id: 'test-' + Date.now() } };
  console.log(doPost(e).getContent());
}

// ---------- helpers ----------

function sheet_() {
  return SpreadsheetApp.openById(prop_('SHEET_ID')).getSheetByName(CFG.TAB);
}
function prop_(k) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error('Run setup() first.');
  return v;
}
function underLimit_(cache) {
  var key = 'n:' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 3700);
  return n <= CFG.MAX_PER_HOUR;
}
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}
function safe_(v) {
  // Keep Sheets from treating submitted text as a formula.
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}
function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

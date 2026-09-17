/* Drives a real Chrome over the DevTools protocol, injects the content script
   into the mock Discord page, and reports what it changed.

   The translation backends are covered elsewhere; what this checks is the part
   that only a browser can exercise — which text nodes get rewritten, and
   whether mentions, links, code and emoji come through untouched. Translation
   itself is stubbed so the result is deterministic: every translated string
   comes back wrapped in «guillemets».

   Usage:
     node test/serve.js 8899 &
     chrome --headless=new --remote-debugging-port=9222 about:blank &
     node test/run-dom-test.js
*/

const fs = require('fs');
const path = require('path');

const DEBUG_PORT = Number(process.env.CDP_PORT) || 9222;
const PAGE_URL = process.env.MOCK_URL || 'http://localhost:8899/';
const SRC = path.join(__dirname, '..', 'src');

const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

/* Run with DT_MODE=tap to check the other reading mode. */
const MODE = process.env.DT_MODE === 'tap' ? 'tap' : 'auto';

/* The chrome.* surface the content script touches, and nothing more. */
const STUB = `
var STORED = ${JSON.stringify({ mode: MODE })};
` + `
window.chrome = {
  runtime: {
    lastError: null,
    // No artwork in the test package, so the button keeps its fallback glyph.
    getURL: function (path) { return '/__missing__/' + path; },
    sendMessage: function (msg, cb) {
      setTimeout(function () {
        cb({ ok: true, text: '\\u00ab' + msg.text + '\\u00bb', detected: 'en' });
      }, 20);
    }
  },
  storage: {
    sync: { get: function (defaults, cb) { setTimeout(function () { cb(STORED); }, 0); } },
    onChanged: { addListener: function () {} }
  }
};
`;

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', reject);
  });
}

function makeSender(ws) {
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  return (method, params) => new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params: params || {} }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const targets = await (await fetch(`http://localhost:${DEBUG_PORT}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No page target — is Chrome running with --remote-debugging-port?');

  const ws = await connect(page.webSocketDebuggerUrl);
  const send = makeSender(ws);

  await send('Page.enable');
  await send('Runtime.enable');

  // Surface anything the page throws, otherwise a broken content script just
  // looks like a page that was never touched.
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      console.log('  page exception:', (d.exception && d.exception.description) || d.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      console.log('  console.error:', msg.params.args.map((a) => a.value).join(' '));
    }
  });

  // The stub and the shared constants can go in at document_start, but the
  // content script itself runs at document_idle in the real extension — before
  // that there is no document.body for it to observe.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: STUB + '\n' + read('common.js') +
      '\ndocument.addEventListener("DOMContentLoaded", function () {\n' +
      read('content.js') +
      '\n});\n'
  });

  await send('Page.navigate', { url: PAGE_URL });
  await sleep(6000);   // let the observer settle and the late message arrive

  const { result } = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(function () {
      var out = [];
      document.querySelectorAll('[id^="message-content-"]').forEach(function (el) {
        out.push({
          id: el.id.replace('message-content-', ''),
          text: el.textContent.trim(),
          marked: el.hasAttribute('data-dt-translated'),
          links: [].map.call(el.querySelectorAll('a'), function (a) { return a.textContent; }),
          mentions: [].map.call(el.querySelectorAll('.mention'), function (m) { return m.textContent; }),
          code: [].map.call(el.querySelectorAll('code'), function (c) { return c.textContent; }),
          names: [].map.call(el.querySelectorAll('[class*="username"]'), function (n) { return n.textContent; })
        });
      });
      // Both buttons live in our own layer, outside Discord's tree.
      var layer = document.querySelector('.dt-layer');
      var send = document.querySelector('.dt-btn-send');
      var msgBtn = document.querySelector('.dt-btn-message');

      // Hovering a message is what offers its button, so do that.
      var first = document.querySelector('[id^="message-content-"]');
      if (first) {
        first.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
      var msgShown = msgBtn && getComputedStyle(msgBtn).display !== 'none';
      var embed = document.querySelector('[class*="embedDescription"]');
      var box = document.querySelector('div[role="textbox"]');
      return {
        messages: out,
        embed: embed && embed.textContent.trim(),
        composer: box && box.textContent,
        layerOutsideReact: !!layer && layer.parentElement === document.body,
        sendButton: send ? {
          lang: send.dataset.dtLang,
          shown: getComputedStyle(send).display !== 'none'
        } : null,
        messageButtonShown: !!msgShown
      };
    })()`
  });

  const data = result.value;
  let failures = 0;
  const check = (ok, label, detail) => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
    if (!ok) failures++;
  };

  console.log('\nMessages as they now read:\n');
  for (const m of data.messages) console.log(`  [${m.id}] ${m.text}`);

  console.log('\nChecks:\n');
  const byId = Object.fromEntries(data.messages.map((m) => [m.id, m]));

  if (MODE === 'tap') {
    console.log('Mode: tap\n');
    check(data.messages.length === 7, 'all seven messages were seen',
          `${data.messages.length} found`);
    check(data.messages.every((m) => !m.marked), 'nothing was translated on its own');
    check(byId['1001'] && byId['1001'].text === 'ngl this is fire',
          'the text is exactly as it was posted', byId['1001'] && byId['1001'].text);
    check(data.messageButtonShown, 'hovering a message offers its translate button');
    check(!!data.sendButton && data.sendButton.shown, 'the send button is on screen');
    check(data.layerOutsideReact, 'the buttons sit outside the app tree');
    console.log(`\n${failures ? failures + ' check(s) failed' : 'all checks passed'}\n`);
    ws.close();
    process.exit(failures ? 1 : 0);
  }

  check(data.messages.length === 7, 'all seven messages were seen',
        `${data.messages.length} found`);
  check(data.messages.every((m) => m.marked), 'every message got the translated marker');
  check(byId['1001'] && byId['1001'].text.includes('«'),
        'message text was rewritten in place');
  check(byId['1006'] && byId['1006'].marked,
        'the message added after load was picked up by the observer');
  check(byId['1003'] && byId['1003'].links[0] === 'https://opensea.io/x',
        'links are left untouched', byId['1003'] && byId['1003'].links[0]);
  check(byId['1003'] && byId['1003'].mentions[0] === '@Alice',
        'mentions are left untouched', byId['1003'] && byId['1003'].mentions[0]);
  check(byId['1004'] && byId['1004'].code[0] === 'npm run build',
        'inline code is left untouched', byId['1004'] && byId['1004'].code[0]);
  check(!!data.embed && data.embed.includes('«'),
        'embed text was translated', data.embed);
  check(byId['1007'] && byId['1007'].names[0] === 'montytran',
        'usernames are never translated', byId['1007'] && byId['1007'].names[0]);
  check(data.layerOutsideReact, 'the buttons sit outside the app tree');
  check(!!data.sendButton && data.sendButton.shown, 'the send button is on screen');
  check(!!data.sendButton && data.sendButton.lang === 'EN',
        'it shows the language it will send in', data.sendButton && data.sendButton.lang);
  check(!data.messageButtonShown,
        'no per-message button while everything translates on its own');

  console.log(`\n${failures ? failures + ' check(s) failed' : 'all checks passed'}\n`);
  ws.close();
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error('test error:', err.message);
  process.exit(2);
});

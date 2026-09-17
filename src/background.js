/* Service worker. Content scripts cannot reach a translation host from a
   discord.com page, so every request goes through here.

   Nothing below needs an API key. When a backend is down or rate-limits, the
   next one in the chain is tried instead. */

importScripts('dictionary.js', 'slang.js', 'tone.js');

const MAX_CHARS = 4500;       // the free endpoints start failing past ~5k
const MAX_ATTEMPTS = 2;       // per provider, before moving to the next one

/* None of this is configurable, because none of it has a second right answer.
   Bing is the only keyless service that reads casual writing properly — Google
   and MyMemory are word-for-word, DeepL has no Bengali and rate-limits without
   a key, and every public LibreTranslate instance is now gone or key-gated. The
   others stay in the chain purely so a Bing outage is not an outage here. */
const ENGINE = 'bing';
const LIBRE_URL = '';

/* Languages the transliteration service can put back into their own script. */
const ROMANIZABLE = new Set([
  'bn', 'hi', 'ur', 'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa',
  'ne', 'si', 'ar', 'fa', 'he', 'ru', 'el'
]);

/* Bing reads casual writing correctly on its own, so pre-chewing the slang
   would only get in its way. The word-for-word backends need the help. */
const LITERAL_PROVIDERS = new Set(['google', 'mymemory', 'libre']);

/* ---------------------------------------------------------------- providers */

/* Bing's public translator page hands out a short-lived token to its own
   front-end. Using it costs nothing and needs no account, and Bing now runs the
   translation through an LLM, so casual chat survives: "ngl this is fire" comes
   back meaning "honestly, this is great" rather than word-for-word.

   Bing answers 401 unless the request carries a browser User-Agent. Chrome
   attaches its own to every fetch from an extension, so nothing needs setting
   here — but that is why these calls fail when replayed from curl or node.

   The token is good for an hour. Cookies are deliberately not sent. */
let bingAuth = null;

async function bingCredentials() {
  if (bingAuth && bingAuth.expires > Date.now()) return bingAuth;

  const res = await fetch('https://www.bing.com/translator', { credentials: 'omit' });
  if (!res.ok) throw httpError(res.status);
  const html = await res.text();

  const ig = /IG:"([^"]+)"/.exec(html);
  // params_AbusePreventionHelper = [<key>,"<token>",<lifetime in ms>]
  const helper = /params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)",(\d+)\]/.exec(html);
  if (!ig || !helper) throw new Error('Bing changed its page layout');

  bingAuth = {
    ig: ig[1],
    key: helper[1],
    token: helper[2],
    // Retire it a minute early rather than racing the expiry.
    expires: Date.now() + Math.max(60000, Number(helper[3]) - 60000)
  };
  return bingAuth;
}

async function viaBing(text, target, source) {
  const auth = await bingCredentials();

  const body = new URLSearchParams({
    fromLang: source && source !== 'auto' ? source : 'auto-detect',
    text: text,
    to: target,
    token: auth.token,
    key: auth.key
  });

  const res = await fetch(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${auth.ig}&IID=translator.5028`,
    {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }
  );
  if (!res.ok) throw httpError(res.status);

  const data = await res.json();
  // A stale token comes back as an object with a statusCode, not an array.
  if (!Array.isArray(data) || !data[0] || !data[0].translations) {
    bingAuth = null;
    throw new Error('Bing rejected the request');
  }

  return {
    text: data[0].translations[0].text,
    detected: (data[0].detectedLanguage && data[0].detectedLanguage.language) || null
  };
}

/* Google publishes several keyless endpoints and they do not share a rate-limit
   bucket, so when the main one starts answering 429 the Chrome-dictionary one
   usually still works. Both are tried before giving up on Google entirely. */
const GOOGLE_HOSTS = [
  {
    build: (text, target, source) =>
      'https://translate.googleapis.com/translate_a/single' +
      `?client=gtx&sl=${encodeURIComponent(source || 'auto')}` +
      `&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    // [[["translated","original",...], ...], null, "detected", ...]
    parse: (data) => {
      if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Bad response');
      return {
        text: data[0].map((seg) => (seg && seg[0]) || '').join(''),
        detected: data[2] || null
      };
    }
  },
  {
    build: (text, target, source) =>
      'https://clients5.google.com/translate_a/t' +
      `?client=dict-chrome-ex&sl=${encodeURIComponent(source || 'auto')}` +
      `&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`,
    // [["translated","detected"]]
    parse: (data) => {
      if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Bad response');
      return { text: String(data[0][0] || ''), detected: data[0][1] || null };
    }
  }
];

async function viaGoogle(text, target, source) {
  let lastError;
  for (const host of GOOGLE_HOSTS) {
    try {
      const res = await fetch(host.build(text, target, source), { credentials: 'omit' });
      if (!res.ok) throw httpError(res.status);
      return host.parse(await res.json());
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function viaMyMemory(text, target, source) {
  // MyMemory has no auto-detect, so an unknown source is assumed to be English.
  const pair = `${source && source !== 'auto' ? source : 'en'}|${target}`;
  const url =
    'https://api.mymemory.translated.net/get' +
    `?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;

  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw httpError(res.status);

  const data = await res.json();
  if (data.responseStatus !== 200 || !data.responseData) {
    throw new Error(data.responseDetails || 'MyMemory refused');
  }
  return { text: data.responseData.translatedText, detected: null };
}

async function viaLibre(text, target, source, libreUrl) {
  if (!libreUrl) throw new Error('No LibreTranslate server configured');

  const res = await fetch(libreUrl.replace(/\/+$/, '') + '/translate', {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: source || 'auto',
      target: target,
      format: 'text'
    })
  });
  if (!res.ok) throw httpError(res.status);

  const data = await res.json();
  if (!data.translatedText) throw new Error(data.error || 'Bad response');

  return {
    text: data.translatedText,
    detected: (data.detectedLanguage && data.detectedLanguage.language) || null
  };
}

const PROVIDERS = {
  bing: viaBing,
  google: viaGoogle,
  mymemory: viaMyMemory,
  libre: viaLibre
};

/** The chosen provider first, then the others as fallbacks. */
function providerChain(engine, libreUrl) {
  const order = [engine, 'bing', 'google', 'mymemory', 'libre'];
  const seen = new Set();
  return order.filter((name) => {
    if (!PROVIDERS[name] || seen.has(name)) return false;
    if (name === 'libre' && !libreUrl) return false;   // nothing to call
    seen.add(name);
    return true;
  });
}

function httpError(status) {
  const err = new Error(`HTTP ${status}`);
  err.status = status;
  return err;
}

/* ------------------------------------------------------------ transliteration */

/* Google's input tools put Latin-typed text back into its own script, with no
   key and no account. This is what makes "vai dam koto ekhon" translatable: on
   its own a translator guesses Vietnamese and answers "shoulder?", but as
   "ভাই দাম কতো এখন" it is unambiguous. */

/* Someone writing Banglish leaves plenty of words in English — "kalke mint
   hobe, gas fee onek beshi". Spelling those out phonetically would wreck them,
   and the same goes for anything Discord needs back byte for byte. */
const KEEP_AS_IS = new RegExp(
  [
    /```[\s\S]*?```/,       // fenced code blocks
    /https?:\/\/\S+/,       // links
    /\|\|[^|]*\|\|/,        // spoilers
    /<[@#!&:t][^>]*>/,      // mentions, channels, custom emoji, timestamps
    /:[a-z0-9_+-]+:/,       // :shortcode: emoji
    /`[^`]*`/,              // inline code
    /\b[A-Z]{2,}\b/,        // acronyms: NFT, ETH, DM, GM
    /\b\w*\d\w*\b/          // anything carrying a digit
  ].map((r) => r.source).join('|'),
  'g'
);

/* Deciding this word by word rather than message by message is what stops
   "but word kintu english" coming out as "boot word": the English words are
   recognised and left standing while the rest goes into Bengali script.

   Short words are the trap. "to", "na", "are", "ki", "ar", "am" and "or" are
   all ordinary Bengali to someone typing Banglish, so nothing under four
   letters belongs here however English it looks. What follows is the
   vocabulary people genuinely code-switch into a Bengali sentence. */
const SAFE_ENGLISH = new Set([
  // ordinary conversation
  'about', 'after', 'again', 'also', 'always', 'because', 'before', 'best',
  'better', 'both', 'but', 'call', 'come', 'even', 'ever', 'every', 'first',
  'from', 'here', 'just', 'last', 'later', 'like', 'made', 'make', 'many',
  'more', 'most', 'much', 'must', 'need', 'next', 'once', 'only', 'other',
  'over', 'same', 'since', 'some', 'soon', 'sorry', 'still', 'sure', 'than',
  'that', 'them', 'then', 'there', 'these', 'they', 'thing', 'think', 'this',
  'those', 'time', 'today', 'very', 'want', 'well', 'were', 'what', 'when',
  'where', 'which', 'while', 'will', 'with', 'without', 'would', 'your',
  'okay', 'please', 'thanks', 'thank', 'welcome', 'tomorrow', 'yesterday',
  'morning', 'night', 'week', 'month', 'year',

  // the vocabulary a server like this one actually runs on
  'account', 'active', 'admin', 'airdrop', 'allowlist', 'amount', 'announce',
  'announcement', 'balance', 'block', 'bridge', 'build', 'burn', 'chain',
  'channel', 'chart', 'check', 'claim', 'collection', 'confirm', 'contract',
  'create', 'deploy', 'discount', 'download', 'drop', 'error', 'event',
  'exchange', 'fake', 'file', 'floor', 'follow', 'free', 'giveaway', 'group',
  'hold', 'holder', 'install', 'invite', 'join', 'link', 'list', 'listing',
  'live', 'lock', 'login', 'market', 'member', 'message', 'mining', 'network',
  'node', 'offer', 'open', 'owner', 'payment', 'phase', 'price', 'private',
  'profile', 'project', 'public', 'pool', 'ready', 'refund', 'release',
  'report', 'request', 'reward', 'role', 'round', 'rule', 'scam',
  'screenshot', 'sell', 'send', 'server', 'setup', 'share', 'stake', 'start',
  'status', 'stop', 'submit', 'supply', 'support', 'swap', 'team', 'ticket',
  'token', 'total', 'transfer', 'update', 'upload', 'user', 'verify', 'video',
  'wait', 'wallet', 'website', 'whitelist', 'winner', 'withdraw', 'work',

  // everyday things nobody says in Bengali any more
  'bank', 'battery', 'browser', 'camera', 'card', 'charge', 'click', 'code',
  'computer', 'data', 'delete', 'device', 'email', 'internet', 'laptop',
  'mobile', 'number', 'online', 'offline', 'order', 'package', 'password',
  'photo', 'problem', 'restart', 'save', 'screen', 'search', 'settings',
  'software', 'speed', 'system', 'version', 'windows'
]);

const MASK = '\u0000';
const MAX_TRANSLIT_CHARS = 900;

async function transliterate(text, lang) {
  const kept = [];
  const masked = text.replace(KEEP_AS_IS, (match) => {
    kept.push(match);
    return MASK + (kept.length - 1) + MASK;
  });

  // The service returns words only, so the separators are held aside and
  // stitched back afterwards. Odd indices are the separators.
  const parts = masked.split(/([^\p{L}\p{N}'\u0000]+)/u);
  const slots = [];
  for (let i = 0; i < parts.length; i += 2) {
    const word = parts[i];
    if (!word.trim() || word.indexOf(MASK) !== -1) continue;
    if (SAFE_ENGLISH.has(word.toLowerCase())) continue;   // stays English
    slots.push(i);
  }
  if (!slots.length) return text;

  const words = slots.map((i) => parts[i]);
  const payload = words.join(' ');
  if (payload.length > MAX_TRANSLIT_CHARS) throw new Error('Too long to transliterate');

  const url =
    'https://inputtools.google.com/request?text=' + encodeURIComponent(payload) +
    '&itc=' + encodeURIComponent(lang) + '-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8';

  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw httpError(res.status);

  const data = await res.json();
  // ["SUCCESS", [[ "<what was sent>", ["<in script>"], ... ]]]
  if (data[0] !== 'SUCCESS' || !Array.isArray(data[1])) throw new Error('Transliteration failed');

  const converted = data[1]
    .map((seg) => (seg[1] && seg[1][0]) || seg[0])
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  // If the word count came back different, the pieces cannot be matched up
  // safely — better to translate the Latin text than to scramble it.
  if (converted.length !== words.length) throw new Error('Transliteration misaligned');

  slots.forEach((slot, n) => { parts[slot] = converted[n]; });

  return parts.join('').replace(/\u0000(\d+)\u0000/g, (_, n) => kept[Number(n)]);
}

/** Latin letters throughout? Then it is worth transliterating. */
function looksRomanized(text) {
  const letters = text.match(/\p{L}/gu);
  if (!letters || !letters.length) return false;
  const latin = letters.filter((ch) => /\p{Script=Latin}/u.test(ch)).length;
  return latin / letters.length > 0.8;
}

/* -------------------------------------------------------------------- cache */

const cache = new Map();
const CACHE_LIMIT = 3000;

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);          // re-insert so the map stays LRU-ordered
  cache.set(key, value);
  return value;
}

function cacheSet(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- translate */

async function translate(text, target, source, romanizeFrom) {
  let raw = (text || '').slice(0, MAX_CHARS);
  if (!raw.trim()) return { text: text, detected: null };

  await dtDictionaryReady();

  const key = `${source || 'auto'}|${target}|${romanizeFrom || ''}|${raw}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  // Latin-typed text goes back into its own script first, and then the source
  // language is known rather than guessed.
  // Latin-typed text is put back into its own script first, but only when that
  // is what it actually is: a Latin script, not ordinary English, and a
  // language the service can transliterate. Nobody has to switch this on.
  let romanizedTo = null;
  if (romanizeFrom && ROMANIZABLE.has(romanizeFrom) &&
      looksRomanized(raw) && !dtLooksEnglish(raw)) {
    try {
      const inScript = await transliterate(raw, romanizeFrom);
      if (inScript && inScript !== raw) {
        raw = inScript;
        romanizedTo = inScript;
        source = romanizeFrom;
      }
    } catch (err) {
      // Not worth failing the whole translation over — carry on with the Latin text.
    }
  }

  const chain = providerChain(ENGINE, LIBRE_URL);
  let lastError = new Error('No provider available');

  // Words like "fomo" and "chill" come back exactly as typed.
  const guarded = dtProtect(raw);

  for (const name of chain) {
    // Each backend gets the form of the text it handles best.
    // Chat spellings are fixed for every backend; the idiom expansion is only
    // needed by the word-for-word ones.
    const respelled = dtRespell(guarded.text);
    const prepared = LITERAL_PROVIDERS.has(name) ? dtExpandSlang(respelled) : respelled;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await PROVIDERS[name](prepared, target, source, LIBRE_URL);
        if (!result.text) throw new Error('Empty translation');
        result.text = dtRestore(result.text, guarded.kept);
        // Relax the polite written register into how people actually type.
        result.text = dtCasualise(result.text, target);
        result.provider = name;
        if (romanizedTo) result.transliterated = romanizedTo;
        cacheSet(key, result);
        return result;
      } catch (err) {
        lastError = err;
        // Rate limits and server hiccups are worth one wait; anything else means
        // this provider will not help, so move on to the next one.
        const retryable = !err.status || err.status === 429 || err.status >= 500;
        if (!retryable || attempt === MAX_ATTEMPTS) break;
        await sleep(500);
      }
    }
  }

  throw lastError;
}

/* ----------------------------------------------------------------- messaging */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'dt:translate') {
    translate(msg.text, msg.target, msg.source, msg.romanizeFrom)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;   // keep the channel open for the async reply
  }

  if (msg && msg.type === 'dt:ping') {
    // Used by the popup's "Test connection" button.
    translate(msg.text || 'hello', msg.target || 'bn', 'en')
      .then((r) => sendResponse({ ok: true, text: r.text, provider: r.provider }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;
  }

  return false;
});

/* Alt+T flips the master switch; the content script watches storage for it. */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-translation') return;
  const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
  await chrome.storage.sync.set({ enabled: !enabled });
});

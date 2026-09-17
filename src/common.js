/* Shared constants. Loaded first as a content script, and via <script> in the popup,
   so everything below lives on the shared isolated-world scope. */

var DT_DEFAULTS = {
  enabled: true,
  target: 'bn',
  // 'everywhere' | 'server' | 'channel'
  scope: 'everywhere',
  // Captured when the user picks 'server' or 'channel' from the popup.
  anchor: { guildId: null, channelId: null },
  // Leave a message alone when Google says it is already in the target language.
  skipSameLanguage: true,
  // Also translate embed titles/descriptions and forum post previews.
  translateEmbeds: true,
  // Show the little "translated" marker under each message.
  showBadge: true,
  // Translators answer in the polite written register. This relaxes the result
  // into how people actually type — only for languages where that can be done
  // by rule without risking a wrong sentence. See src/tone.js.
  casual: true,
  // Leave internet vocabulary alone: fomo, chill, vibe, wagmi, mint, gas.
  // Every language just says these; translating them reads worse.
  keepSlang: true,

  // --- Outgoing: what you type gets translated before it is sent ---
  outgoingEnabled: false,
  outgoingTarget: 'en',
  // 'send'    -> translate, then send straight away
  // 'preview' -> translate into the box and let you hit Enter yourself
  outgoingMode: 'send',
  // Set this when you type your language in Latin letters — Banglish, Hinglish,
  // Arabizi. The text is put back into its own script before being translated,
  // because translators read "vai dam koto ekhon" as Vietnamese otherwise.
  romanized: false,
  romanizedLang: 'bn',

  // --- How the text actually gets translated ---
  // Every backend here is keyless: nothing to sign up for, nothing to paste in.
  // If one is down or rate-limits, the next is tried automatically.
  // 'bing'     -> reads casual chat and slang properly. The default.
  // 'google'   -> fastest, but word for word.
  // 'mymemory' -> open API, roughly 5k words a day per address.
  // 'libre'    -> a LibreTranslate server you run yourself (see libreUrl).
  engine: 'bing',
  // A LibreTranslate instance of your own, e.g. http://localhost:5000.
  // Blank by default: every public instance is currently offline or asking for
  // a key, so self-hosting is the only keyless route to it.
  libreUrl: ''
};

var DT_LANGUAGES = [
  ['bn', 'Bengali — বাংলা'],
  ['en', 'English'],
  ['hi', 'Hindi — हिन्दी'],
  ['ur', 'Urdu — اردو'],
  ['ar', 'Arabic — العربية'],
  ['es', 'Spanish — Español'],
  ['pt', 'Portuguese — Português'],
  ['fr', 'French — Français'],
  ['de', 'German — Deutsch'],
  ['it', 'Italian — Italiano'],
  ['nl', 'Dutch — Nederlands'],
  ['ru', 'Russian — Русский'],
  ['uk', 'Ukrainian — Українська'],
  ['pl', 'Polish — Polski'],
  ['tr', 'Turkish — Türkçe'],
  ['fa', 'Persian — فارسی'],
  ['he', 'Hebrew — עברית'],
  ['ja', 'Japanese — 日本語'],
  ['ko', 'Korean — 한국어'],
  ['zh-CN', 'Chinese (Simplified) — 简体中文'],
  ['zh-TW', 'Chinese (Traditional) — 繁體中文'],
  ['id', 'Indonesian — Bahasa Indonesia'],
  ['ms', 'Malay — Bahasa Melayu'],
  ['tl', 'Filipino'],
  ['vi', 'Vietnamese — Tiếng Việt'],
  ['th', 'Thai — ไทย'],
  ['my', 'Burmese — မြန်မာ'],
  ['ne', 'Nepali — नेपाली'],
  ['si', 'Sinhala — සිංහල'],
  ['ta', 'Tamil — தமிழ்'],
  ['te', 'Telugu — తెలుగు'],
  ['ml', 'Malayalam — മലയാളം'],
  ['kn', 'Kannada — ಕನ್ನಡ'],
  ['mr', 'Marathi — मराठी'],
  ['gu', 'Gujarati — ગુજરાતી'],
  ['pa', 'Punjabi — ਪੰਜਾਬੀ'],
  ['sw', 'Swahili — Kiswahili'],
  ['sv', 'Swedish — Svenska'],
  ['no', 'Norwegian — Norsk'],
  ['da', 'Danish — Dansk'],
  ['fi', 'Finnish — Suomi'],
  ['cs', 'Czech — Čeština'],
  ['ro', 'Romanian — Română'],
  ['hu', 'Hungarian — Magyar'],
  ['el', 'Greek — Ελληνικά']
];

/** Pull { guildId, channelId } out of a discord.com URL. @me DMs use "@me" as the guild. */
function dtParseLocation(href) {
  var m = /discord\.com\/channels\/([^/?#]+)(?:\/([^/?#]+))?/.exec(href || '');
  if (!m) return { guildId: null, channelId: null };
  return { guildId: m[1], channelId: m[2] || null };
}

function dtLoadSettings() {
  return new Promise(function (resolve) {
    chrome.storage.sync.get(DT_DEFAULTS, function (stored) {
      resolve(Object.assign({}, DT_DEFAULTS, stored));
    });
  });
}

/* Languages that Google's transliteration service can put back into their own
   script. Anything outside this list cannot use the "I type in Latin letters"
   option. */
var DT_ROMANIZABLE = [
  'bn', 'hi', 'ur', 'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa',
  'ne', 'si', 'ar', 'fa', 'he', 'ru', 'el'
];

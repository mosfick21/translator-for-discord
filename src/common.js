/* Shared constants. Loaded first as a content script, and via <script> in the
   popup, so everything below lives on the shared isolated-world scope.

   There are six settings. Everything else the extension does — keeping internet
   words, relaxing the polite register, putting Latin-typed text back into its
   own script, which translation service to use — has one right answer, so it is
   not a setting. */

var DT_DEFAULTS = {
  enabled: true,

  // 'auto' translates every message as it arrives.
  // 'tap'  leaves them as posted and offers a button on the one you point at.
  mode: 'auto',

  // What you read. 'auto' detects each message on its own, which is right for a
  // mixed channel; naming a language stops the detector guessing in a server
  // that only speaks one.
  source: 'auto',
  target: 'bn',

  // What the translate button in the message box sends in.
  outgoingTarget: 'en',

  // 'everywhere' | 'server' | 'channel', with the anchor captured from the tab
  // that was open when the choice was made.
  scope: 'everywhere',
  anchor: { guildId: null, channelId: null }
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

/** Pull { guildId, channelId } out of a discord.com URL. @me DMs use "@me". */
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

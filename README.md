<div align="center">

<img src="assets/banner.png" alt="Translator for Discord" width="100%">

# Translator for Discord

**For the channels you cannot read.**

![Manifest](https://img.shields.io/badge/manifest-v3-5865F2)
![Languages](https://img.shields.io/badge/languages-45-5865F2)
![No key](https://img.shields.io/badge/API%20key-none-23a55a)
![Dictionary](https://img.shields.io/badge/dictionary-364k%20words-23a55a)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

---

## The problem

A big Discord server is not one language. It is `#indonesia`, `#japan`,
`#arabic`, `#india`, `#pakistan`, `#brasil`, `#türkiye` — and the half of the
server you cannot read is usually the half that knows something first.

English is the easy part. Everyone already has that. What nobody has is the
Indonesian channel where the drop got called an hour early, or the Japanese one
where somebody already worked the bug out.

This makes those channels readable, and lets you answer in them.

```diff
  #indonesia
- turu dulu kawan, besok lanjut lagi
+ প্রথমে ঘুমাও বন্ধু, কাল আবার চালিয়ে যাবে

  #japan
- 今日のイベント何時から始まりますか
+ আজকের ইভেন্ট কখন থেকে শুরু হবে?

  #arabic
- هل يعرف أحد متى يبدأ الحدث
+ কারও কি জানা আছে ঘটনা কখন শুরু হবে

  #turkiye
- etkinlik saat kacta basliyor acaba
+ কার্যক্রমটি কখন শুরু হচ্ছে কি?
```

Messages are rewritten **where they sit**. Nothing moves, nothing is added, and
you read the channel the way everyone else in it does.

---

## Answering back

You are not only reading. Type in your own language, press the translate button
in the message box, and it leaves in theirs.

```diff
- bhai event ta kokhon shuru hobe
+ Kakak, acara itu akan mulai kapan?            #indonesia
+ 兄さん、そのイベントはいつ始まりますか          #japan
```

That is Bengali typed on an English keyboard. Banglish, Hinglish, Urdish,
Arabizi and thirteen more work the same way, with nothing to switch on — the
extension works out that these are Latin letters standing in for another
script, and puts it back before translating.

---

## Install

```
1.  Code → Download ZIP, unzip somewhere permanent
2.  chrome://extensions  →  Developer mode  →  Load unpacked
3.  Open Discord, click the icon, pick your language
```

Chrome · Edge · Brave · Opera. Firefox needs
[one line changed](ARCHITECTURE.md).

No account, no sign-up, no API key. Nothing to pay for, nothing to set up.

---

## Settings

Six, and that is the lot.

| | |
|---|---|
| **On / off** | Or `Alt+T` |
| **Reading** | Translate everything, or only the message you point at |
| **From → Into** | Detect each message, or pin the language a channel speaks |
| **Send as** | What the translate button in the message box sends in |
| **Where it runs** | Everywhere, one server, or one channel |

Nothing else is a setting, because nothing else has a second right answer.
Internet words are always kept as they are, the polite written register is
always relaxed into how people actually type, embeds are always included, and a
message already in your language is always left alone.

---

## What it gets right that a plain translator does not

**Chat is not prose.** `ngl this is fire` means *honestly, this is great*, not
*I won't lie, this fire*. `wen mint?` is a question about timing, not the word
*when* misspelled into nonsense.

**Some words should not be translated at all.** Every language just says *fomo*.
The extension carries a dictionary of 364,000 English words in 356 KB — a Latin
word it does not recognise was invented by the internet, so it is held back and
put straight back afterwards. Words nobody has ever listed work the first time
they turn up.

```diff
- fomo is real rn, everyone aping in
+ fomo এখন সত্যি, সবাই এতে যোগ দিচ্ছে

- this is so skibidi ngl
+ এটা সত্যিই skibidi, সত্যি কথা বলতে
```

**Names are names.** A username in a reply preview is not a word to translate.

**Bot commands still work.** `/ban`, `!verify` and `?help` go through byte for
byte, as do links, mentions, custom emoji, code blocks and spoilers.

**Enter is still Enter.** It sends exactly what you typed. Translating is
something you press a button to do, so nothing ever leaves in a language you did
not ask for.

---

## Languages

⌨️ marks the ones you can type in English letters.

| | | |
|---|---|---|
| 🇧🇩 **Bengali** বাংলা ⌨️ | 🇬🇧 **English** | 🇮🇳 **Hindi** हिन्दी ⌨️ |
| 🇵🇰 **Urdu** اردو ⌨️ | 🇸🇦 **Arabic** العربية ⌨️ | 🇪🇸 **Spanish** Español |
| 🇵🇹 **Portuguese** Português | 🇫🇷 **French** Français | 🇩🇪 **German** Deutsch |
| 🇮🇹 **Italian** Italiano | 🇳🇱 **Dutch** Nederlands | 🇷🇺 **Russian** Русский ⌨️ |
| 🇺🇦 **Ukrainian** Українська | 🇵🇱 **Polish** Polski | 🇹🇷 **Turkish** Türkçe |
| 🇮🇷 **Persian** فارسی ⌨️ | 🇮🇱 **Hebrew** עברית ⌨️ | 🇯🇵 **Japanese** 日本語 |
| 🇰🇷 **Korean** 한국어 | 🇨🇳 **Chinese** 简体中文 | 🇹🇼 **Chinese** 繁體中文 |
| 🇮🇩 **Indonesian** Bahasa Indonesia | 🇲🇾 **Malay** Bahasa Melayu | 🇵🇭 **Filipino** |
| 🇻🇳 **Vietnamese** Tiếng Việt | 🇹🇭 **Thai** ไทย | 🇲🇲 **Burmese** မြန်မာ |
| 🇳🇵 **Nepali** नेपाली ⌨️ | 🇱🇰 **Sinhala** සිංහල ⌨️ | 🇮🇳 **Tamil** தமிழ் ⌨️ |
| 🇮🇳 **Telugu** తెలుగు ⌨️ | 🇮🇳 **Malayalam** മലയാളം ⌨️ | 🇮🇳 **Kannada** ಕನ್ನಡ ⌨️ |
| 🇮🇳 **Marathi** मराठी ⌨️ | 🇮🇳 **Gujarati** ગુજરાતી ⌨️ | 🇮🇳 **Punjabi** ਪੰਜਾਬੀ ⌨️ |
| 🇰🇪 **Swahili** Kiswahili | 🇸🇪 **Swedish** Svenska | 🇳🇴 **Norwegian** Norsk |
| 🇩🇰 **Danish** Dansk | 🇫🇮 **Finnish** Suomi | 🇨🇿 **Czech** Čeština |
| 🇷🇴 **Romanian** Română | 🇭🇺 **Hungarian** Magyar | 🇬🇷 **Greek** Ελληνικά ⌨️ |

Any of the 45 can be read from, sent to, or both.

---

## How it works

<div align="center">

<img src="assets/architecture.png" alt="Architecture" width="100%">

</div>

One translator, no key, nothing to sign up for. Bing is the only keyless service
that reads casual writing the way a person does — Google and MyMemory render
word for word, DeepL answers 429 without a key and has no Bengali at all, and
every public LibreTranslate instance is now gone or key-gated. The others stay
in the chain so that a Bing outage is not an outage here, but there is nothing
to choose.

Internals in **[ARCHITECTURE.md](ARCHITECTURE.md)** — the pipeline, the
dictionary format, how React is survived, known limits.

---

## Privacy

Message text goes to the translation service and nowhere else. No cookies, no
account, no logging, no analytics. Your six settings stay in your browser.

For nothing to leave your network at all, run LibreTranslate yourself and point
the extension at it in `src/background.js`:

```bash
docker run -p 5000:5000 libretranslate/libretranslate
```

---

## Development

```bash
npm run serve                                              # mock Discord page
chrome --headless=new --remote-debugging-port=9222 about:blank
npm test                                                   # DOM checks
DT_MODE=tap npm test                                       # the other reading mode
npm run build:dictionary                                   # rebuild the filter
```

| Add | Where |
|---|---|
| A language | `DT_LANGUAGES` in `src/common.js` |
| A word that stays untranslated | `DT_KEEP_WORDS` in `src/slang.js` |
| A chat spelling | `DT_RESPELL` in `src/slang.js` |
| Tone rules for a language | `DT_TONE` in `src/tone.js` |
| A translation backend | `PROVIDERS` in `src/background.js` |

Issues and pull requests welcome.

---

## License

MIT — see [LICENSE](LICENSE).

<div align="right"><sub>built by <b>mosfick</b></sub></div>

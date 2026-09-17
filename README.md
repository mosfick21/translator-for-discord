<div align="center">

<img src="assets/banner.png" alt="Translator for Discord" width="100%">

# Translator for Discord

**Read every Discord message in your own language. Send yours in theirs.**

![Manifest](https://img.shields.io/badge/manifest-v3-5865F2)
![Languages](https://img.shields.io/badge/languages-45-5865F2)
![Backends](https://img.shields.io/badge/backends-5%20keyless-23a55a)
![Dictionary](https://img.shields.io/badge/dictionary-364k%20words-23a55a)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

---

| | |
|---|---|
| **Setup** | None. No account, no API key |
| **Backends** | Bing · Google ×2 · MyMemory · LibreTranslate |
| **Languages** | 45 to read and write, 17 typeable in Latin letters |
| **Scope** | All of Discord, one server, or one channel |
| **Untouched** | Bot commands, links, mentions, emoji, code |

---

## Use cases

### The server talks in English and you would rather not

Messages are rewritten where they sit. Nothing moves.

```diff
- gm frens, wen mint?
+ gm frens, কখন mint?

- ngl this is fire
+ সত্য বলতে এটা দারুন

- bro this is sus, might be a rugpull
+ ভাই এটা sus, হতে পারে একটি rugpull
```

### Someone writes in a language you did not expect

Detected per message. You never pick the source language.

```diff
- ¿alguien sabe el precio ahora?
+ এখন কেউ দাম জানে?
```

### You want to reply, but not in English

Type in your language, press Enter, the message leaves translated.

```diff
- ভাই এটা তো দারুণ হইছে
+ Brother, this has turned out great
```

### You type your language on an English keyboard

Banglish, Hinglish, Arabizi — turn it on, say which language, done.

```diff
- vai dam koto ekhon
+ Brother, how much is the price now?

- ei project ta scam mone hoy, admin er sathe kotha bolo
+ This project seems like a scam, talk to the admin.
```

English words inside the sentence stay English:

```
  ei project ta scam mone hoy   →   এই project তা scam মনে হয়
```

### Internet words survive

Every language just says *fomo*.

```diff
- fomo is real rn, everyone aping in
+ fomo এখন সত্যি, সবাই এতে যোগ দিচ্ছে

- gas is insane, floor went to 2 ETH
+ gas পাগল, floor ২ ETH তে চলে গেছে
```

Words nobody has listed work the first time they appear:

```diff
- this is so skibidi ngl
+ এটা সত্যিই skibidi, সত্যি কথা বলতে
```

### Shorthand still means something

Translations come from a language model, so the wording varies a little run to
run. The meaning does not.

```diff
- idk tbh, brb
+ আমি আসলেই জানি না, একটু পরে আসছি
```

### Nothing breaks

```
  /ban @user                   →   /ban @user
  !verify                      →   !verify
  check https://opensea.io/x   →   চেক করো https://opensea.io/x
  run `npm run build` first    →   প্রথমে `npm run build` চালান
```

---

## Install

```
1.  Code → Download ZIP, unzip somewhere permanent
2.  chrome://extensions  →  Developer mode  →  Load unpacked
3.  Open Discord, click the icon, pick a language
```

Chrome · Edge · Brave · Opera. Firefox needs
[one line changed](ARCHITECTURE.md).

---

## Settings

**Reading**

| | |
|---|---|
| Translate into | 45 languages |
| Skip same language | Leaves what you can already read |
| Embeds | Bot embeds and link previews too |
| Keep internet words | *fomo*, *chill*, *mint* stay in English |
| Everyday wording | Not the polite written form |

**Writing**

| | |
|---|---|
| Send in | The language your message goes out in |
| Latin letters | Banglish, Hinglish, Arabizi |
| On Enter | Send it, or show the translation first |

**Where**

| | |
|---|---|
| All of Discord | Every server and DM |
| This server only | The one open when you chose it |
| This channel only | That one channel |

`Alt+T` toggles · `Alt+click` a message shows the original

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

---

## How it works

<div align="center">

<img src="assets/architecture.svg" alt="Architecture" width="100%">

</div>

Five backends, no keys. If one fails, the next answers.

| | | |
|---|---|---|
| **Bing** | *default* | Reads casual writing the way a person does |
| **Google** | | Fastest, word for word. Two endpoints, separate limits |
| **MyMemory** | | Open API, ~5,000 words a day |
| **LibreTranslate** | | Open source, on a server you run |

Internals in **[ARCHITECTURE.md](ARCHITECTURE.md)** — pipeline order, dictionary
format, how React is survived, known limits.

---

## Privacy

Message text goes to the backend you chose and nowhere else. No cookies, no
account, no logging, no analytics. Settings stay in your browser.

Keep it off the network entirely:

```bash
docker run -p 5000:5000 libretranslate/libretranslate
```

---

## Development

```bash
npm run serve                                              # mock Discord page
chrome --headless=new --remote-debugging-port=9222 about:blank
npm test                                                   # 8 DOM checks
npm run build:dictionary                                   # rebuild the filter
```

| Add | Where |
|---|---|
| A language | `DT_LANGUAGES` in `src/common.js` |
| A word that stays untranslated | `DT_KEEP_WORDS` in `src/slang.js` |
| A chat spelling | `DT_RESPELL` in `src/slang.js` |
| Tone rules | `DT_TONE` in `src/tone.js` |
| A backend | `PROVIDERS` in `src/background.js` |

Issues and pull requests welcome.

---

## License

MIT — see [LICENSE](LICENSE).

<div align="right"><sub>built by <b>mosfick</b></sub></div>

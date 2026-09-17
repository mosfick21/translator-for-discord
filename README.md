<div align="center">

<img src="assets/banner.png" alt="" width="100%">

# Translator for Discord

Every message in your language, in place — and yours in theirs.

![Manifest](https://img.shields.io/badge/manifest-v3-5865F2)
![Languages](https://img.shields.io/badge/languages-45-5865F2)
![Backends](https://img.shields.io/badge/backends-5%20keyless-23a55a)
![Dictionary](https://img.shields.io/badge/dictionary-364k%20words-23a55a)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

---

## Overview

A browser extension that rewrites Discord messages where they sit. Nothing
moves, nothing is inserted; the words arrive in your language, in the same
place, in the same order. Typing works the other way — write in your language,
press Enter, the message leaves translated.

| | |
|---|---|
| **Setup** | None. No account, no API key, nothing to paste in |
| **Backends** | Bing · Google ×2 · MyMemory · self-hosted LibreTranslate |
| **Languages** | 45 to read and write, 17 typeable in Latin letters |
| **Scope** | All of Discord, one server, or a single channel |
| **Untouched** | Bot commands, links, mentions, emoji, code, spoilers |

```
  ┌──────────────┐          ┌──────────────┐        ┌──────────────┐
  │ discord.com  │  message │ service      │  text  │ Bing         │
  │              │─────────▶│ worker       │───────▶│ Google       │
  │ content.js   │          │              │        │ MyMemory     │
  │ observes,    │◀─────────│ protect,     │◀───────│ LibreTranslate│
  │ rewrites     │          │ respell,     │        └──────────────┘
  └──────────────┘          │ cache, relax │         first to answer
   mentions, links,         └──────────────┘
   code left intact          364k-word dictionary
                             decides what stays
```

## Install

1. **Code → Download ZIP**, then unzip.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. **Load unpacked** → choose the folder.
4. Open Discord, click the icon, pick a language.

Chrome, Edge, Brave, Opera. Firefox needs one manifest line changed — see
[Development](#development).

## Settings

Everything is in the popup and applies immediately.

| Reading | |
|---|---|
| Target language | 45 available |
| Skip same language | Leaves messages you can already read |
| Embeds | Bot embeds and link previews too |
| Keep internet words | *fomo*, *chill*, *wagmi* stay as typed |
| Everyday wording | Relaxes the polite written register |

| Writing | |
|---|---|
| Send in | The language your message goes out in |
| Latin letters | Banglish, Hinglish, Arabizi typed on an English keyboard |
| On Enter | Send straight away, or show the translation first |

**Alt+T** toggles. **Alt+click** a message shows the original.

## How it works

Text nodes are rewritten individually, so mentions, links and formatting survive
and React does not notice. Discord re-renders constantly; a `MutationObserver`
catches that and re-applies from cache. The *translated* marker and the
Alt+click original are CSS pseudo-elements — nothing is inserted into Discord's
DOM, which React would tear out.

A message broken up by a mention or a link is still sent as one string with
numbered placeholders, so the translator sees a sentence rather than fragments.

**What stays untranslated** is decided by a dictionary rather than a list. A
Latin word absent from 364,000 English words is one the internet invented, and
one no translator will render well, so it is held back and restored afterwards.
New words work on first sight. A short curated list covers the other case —
words that *are* ordinary English but mean something else here: *chill*, *vibe*,
*mint*, *gas*, *floor*.

**Latin-typed input** is put back into its own script before translating —
otherwise `vai dam koto ekhon` reads as Vietnamese. English words inside the
sentence are left alone.

```
  gm frens, wen mint?  →  gm frens, কখন mint?
  vai dam koto ekhon   →  Brother, how much is the price now?
```

## Development

```
manifest.json           MV3 manifest
popup/                  settings panel, Discord's own palette
src/content.js          observes the message list, rewrites text, drives the composer
src/background.js       network, provider chain, cache
src/slang.js            respellings, expansions, words held back
src/dictionary.js       Bloom filter lookup
src/dictionary.bin      364k words in 356 KB
src/tone.js             polite register relaxed into speech
test/                   mock Discord page, DevTools-driven DOM test
tools/                  rebuilds the dictionary
assets/                 artwork and the script that cuts it to size
```

```bash
npm run serve                                              # mock Discord page
chrome --headless=new --remote-debugging-port=9222 about:blank
npm test                                                   # 8 DOM checks
npm run build:dictionary                                   # rebuild the filter
```

The DOM test drives a real Chrome over the DevTools protocol with translation
stubbed, and asserts what changed: messages rewritten in place, a late message
caught by the observer, mentions and links and code untouched.

**Firefox** — replace the service worker declaration:

```json
"background": { "scripts": ["src/background.js"] }
```

**Extending** — languages in `DT_LANGUAGES`, kept words in `DT_KEEP_WORDS`, tone
rules in `DT_TONE`, backends in `PROVIDERS`.

## Privacy

Message text goes to the selected translation service and nowhere else. No
cookies, no account, no logging, no analytics. Settings stay in your browser.
For nothing to leave your network at all, run LibreTranslate yourself:

```bash
docker run -p 5000:5000 libretranslate/libretranslate
```

## License

MIT — see [LICENSE](LICENSE).

<div align="right"><sub>built by <b>mosfick</b></sub></div>

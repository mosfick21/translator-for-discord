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
  ┌──────────────┐          ┌──────────────┐        ┌───────────────┐
  │ discord.com  │  message │ service      │  text  │ Bing          │
  │              │─────────▶│ worker       │───────▶│ Google        │
  │ content.js   │          │              │        │ MyMemory      │
  │ observes,    │◀─────────│ protect,     │◀───────│ LibreTranslate│
  │ rewrites     │          │ respell,     │        └───────────────┘
  └──────────────┘          │ cache, relax │         first to answer
   mentions, links,         └──────────────┘
   code left intact          364k-word dictionary
                             decides what stays
```

---

## Install

1. **Code → Download ZIP**, then unzip it somewhere permanent — Chrome loads
   the extension from that folder every time it starts, so it cannot be deleted.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and choose the folder.
5. Open Discord in the browser, click the extension icon, pick your language.

Chrome, Edge, Brave, Opera and any other Chromium browser. Firefox needs one
manifest line changed — see [Development](#development).

---

## Using it

Everything is in the popup. Changes save and apply the moment you make them;
there is no save button, and no need to reload Discord.

### Reading in your language

Open the popup and set **Translate everything into**. That is the whole setup —
messages already on screen are rewritten within a second, and everything that
arrives afterwards is translated as it appears.

Four switches shape the result:

| Switch | What it does | Leave it on when |
|---|---|---|
| **Leave messages alone if they are already in that language** | The service reports what language it detected; matching messages are skipped | Always — it saves requests and avoids pointless rewrites |
| **Translate embeds too** | Bot embeds, link previews and forum cards as well as messages | Your server uses bots that post embeds |
| **Keep internet words as they are** | *fomo*, *chill*, *wagmi*, *mint* stay in English | Always, unless you want everything rendered literally |
| **Everyday wording** | Relaxes the polite written register into how people type | You are reading chat rather than documents |

### Seeing what was really written

Hold **Alt** and click any message. It swaps back to the original; Alt+click
again to return. Useful when a translation reads oddly and you want to check.

Hovering a translated message also shows the original as a tooltip.

### Sending in another language

Turn on **Translate what I type before sending** and choose the language to send
in. Then decide what Enter should do:

| | |
|---|---|
| **Translate and send it** | One keystroke. You type, press Enter, the translated message goes out |
| **Translate, let me check it first** | The box fills with the translation and waits. Press Enter again to send, or edit it first |

Start with **let me check it first** for a day or two. Once you trust it, switch
to sending directly.

Slash commands and bot commands are never touched, so `/ban`, `!verify` and
`?help` still work exactly as typed.

### Typing your language in English letters

If you write your language on an English keyboard — Banglish, Hinglish, Arabizi
— turn on **I type my language in English letters** and set **the language I am
really typing**.

Without it, translators guess wrong. `vai dam koto ekhon` gets read as
Vietnamese and comes back as *"shoulder?"*. With it, the text is put back into
its own script first, and the language is no longer a guess:

```
  vai dam koto ekhon  →  ভাই দাম কতো এখন  →  "Brother, how much is the price now?"
```

English words inside the sentence stay English, because that is how people
write:

```
  ei project ta scam mone hoy, admin er sathe kotha bolo
    →  এই project তা scam মনে হয়, admin এর সাথে কথা বলো
    →  "This project seems like a scam, talk to the admin."
```

Seventeen languages: Bengali, Hindi, Urdu, Tamil, Telugu, Malayalam, Kannada,
Marathi, Gujarati, Punjabi, Nepali, Sinhala, Arabic, Persian, Hebrew, Russian,
Greek.

If you write a message that is plainly ordinary English, it is left alone
rather than spelled out phonetically.

### Limiting where it runs

Translating a server you already understand is just noise. Open the popup while
you are in the channel or server you care about and pick a scope:

| | |
|---|---|
| **All of Discord** | Every server and every DM |
| **This server only** | The server that was open when you chose it |
| **This channel only** | That one channel |

The last two are pinned to wherever you were standing when you selected them.
To move the pin, go to the new channel and click the option again.

### Choosing a translation service

The default reads casual writing properly and is the right choice for chat. The
others exist for when it is not:

| | | |
|---|---|---|
| **Bing** | *default* | Runs the text through a language model, so slang and tone survive |
| **Google** | | Fastest, but word for word. Two endpoints with separate rate limits |
| **MyMemory** | | Open API, roughly 5,000 words a day per address |
| **LibreTranslate** | | Fully open source, on a server you run yourself |

You do not have to think about failure: if the selected service stops answering
or rate-limits you, the next one takes over automatically. **Test it** in the
popup shows which one actually answered.

The difference the default makes:

```
  ngl this is fire
    Bing      সত্য বলতে এটা দারুন        "honestly, this is great"
    Google    মিথ্যে বলব না এই আগুন      "I won't lie, this fire"
```

### Turning it off

**Alt+T** anywhere, or the switch at the top of the popup. Messages revert to
their original text immediately.

---

## How it works

### Rewriting without breaking Discord

Text nodes are rewritten one at a time rather than replacing message elements.
That is what keeps mentions, links, emoji and formatting intact — they are
separate nodes and are never visited.

Discord is React, and React re-renders constantly, which would normally wipe any
change. A `MutationObserver` watches for that and re-applies from an in-memory
cache, so nothing flickers back to the original.

The *translated* marker and the Alt+click original are CSS pseudo-elements.
Nothing is inserted into Discord's DOM — React would tear an injected element
out and can crash trying.

### Whole messages, not fragments

A message like `hey @Alice the floor moved, check <link> when you can` is three
separate text nodes with a mention and a link wedged between them. Translated
piecewise, the translator never sees a sentence.

Instead the pieces are joined with numbered placeholders, sent as one string,
and split apart again on the way back. If the translator moves the placeholders
around, the extension notices the pieces no longer line up and falls back to
translating them separately.

### Deciding what stays untranslated

Some words have no translation worth having. Every language just says *fomo*,
and a translator that insists on rendering it drops *"the fear of missing out"*
into the middle of a chat message.

This is not a list someone has to maintain. The extension carries a Bloom filter
over 364,000 English words in 356 KB. A Latin word the dictionary does not know
is one the internet invented, and one no translator will handle well, so it is
held back before translation and restored afterwards. Words nobody has ever
listed work the first time they appear:

```
  this is so skibidi ngl  →  এটা সত্যিই skibidi, সত্যি কথা বলতে
  bro is delulu fr        →  ভাই delulu সত্যি
```

A Bloom filter is used because the answer only has to be safe in one direction:
a real word is never missed, so nothing genuine is ever wrongly held back. About
two per cent of invented words look real and get translated anyway.

Two curated lists handle what the dictionary cannot:

- **Words that are ordinary English but mean something else here** — *chill*,
  *vibe*, *sus*, *mint*, *gas*, *floor*. The dictionary knows them, so they have
  to be named.
- **Greetings and address** — *gm*, *gn*, *frens*, *ser*, *fam*. An English
  dictionary does contain `gm` and `gn` as obscure words, so they read as real.

### Spellings and shorthand

`wen mint?` translates to *"you mint?"* or *"white mint?"* depending on the day,
because no translator knows the word. Chat spellings are corrected for every
backend before translation — `wen` → `when`, `cuz` → `because`, `u` → `you`.

Shorthand that stands for a whole sentence is different: `brb`, `gtg`, `ttyl`
are absent from any dictionary but very much want translating, so they are
handed to the translator rather than held back. For the word-for-word backends
they are expanded first, since Google renders `ngl` as nothing at all.

### Everyday wording

Translation engines answer in the polite written register, which reads wrong in
a chat window — nobody types *"আপনি কখন মিন্ট করবেন?"*. The result is relaxed
into ordinary speech: *"তুমি কখন mint করবে?"*.

This is the one part that cannot treat every language alike, because politeness
is built differently in each. Rules ship where a mechanical change is reliably
correct — Bengali, Hindi, Turkish, Indonesian and Malay mark politeness in a
pronoun or a regular suffix. Spanish, French and German conjugate the verb to
match, so swapping the pronoun alone would produce something no speaker would
write; those pass through untouched.

### What is never sent anywhere

Bot commands, links, mentions, channel references, custom emoji, inline code,
fenced code blocks, spoilers, timestamps, and anything containing a digit. They
are held out of the request and put back unchanged.

---

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

The DOM test drives a real Chrome over the DevTools protocol, injects the
content script into a page that reproduces Discord's markup with translation
stubbed, and asserts what changed: messages rewritten in place, a message
arriving after load caught by the observer, and mentions, links and code
untouched.

**Firefox** — replace the service worker declaration:

```json
"background": { "scripts": ["src/background.js"] }
```

**Extending**

| | |
|---|---|
| A language | `DT_LANGUAGES` in `src/common.js` |
| A word that should stay untranslated | `DT_KEEP_WORDS` in `src/slang.js` — only needed if it is also ordinary English |
| A chat spelling | `DT_RESPELL` in `src/slang.js` |
| Tone rules for a language | `DT_TONE` in `src/tone.js` — the bar is that the change must never be wrong |
| A translation backend | A function returning `{ text, detected }`, registered in `PROVIDERS` |

---

## Privacy

Message text goes to the translation service you selected and nowhere else. No
cookies are attached, no account is involved, nothing is logged, and no
analytics of any kind are collected. Settings live in your own browser.

For nothing to leave your network at all, run LibreTranslate yourself and point
the extension at it:

```bash
docker run -p 5000:5000 libretranslate/libretranslate
```

---

## License

MIT — see [LICENSE](LICENSE).

<div align="right"><sub>built by <b>mosfick</b></sub></div>

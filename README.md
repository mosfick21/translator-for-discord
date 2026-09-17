<div align="center">

<img src="assets/banner.png" alt="" width="100%">

# Translator for Discord

**Read every message in your language. Send yours in theirs.**

No account. No API key. Nothing to configure.

</div>

---

Discord messages are translated where they sit. Nothing moves, nothing is
inserted — the words simply arrive in your language, in the same place, in the
same order.

It works the other way round too: type in your own language, press Enter, and
the message leaves translated.

```
      they write                        you read
  ─────────────────────────────────────────────────────────────
  gm frens, wen mint?          →   সুপ্রভাত বন্ধু, কখন mint হবে?
  ngl this is fire             →   সত্য বলতে এটা দারুন

      you type                          they read
  ─────────────────────────────────────────────────────────────
  vai dam koto ekhon           →   Brother, how much is the price now?
  ei project ta scam mone hoy  →   This project seems like a scam
```

## Install

Not on the Chrome Web Store yet, so load it directly — it takes a minute.

1. Download this repository (**Code → Download ZIP**) and unzip it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and choose the folder.
5. Open Discord, click the extension icon, pick your language.

Works in Chrome, Edge, Brave, Opera and any other Chromium browser.
Firefox needs one line changed — see [Development](#development).

## Using it

Everything lives in the popup. Changes apply immediately; there is no save
button.

### Messages you read

Pick the language you want everything translated into. Forty-five are
available.

| Option | What it does |
|---|---|
| **Leave messages alone if they are already in that language** | Skips the ones you can already read |
| **Translate embeds too** | Bot embeds and link previews as well as messages |
| **Keep internet words as they are** | *fomo*, *chill*, *wagmi* stay as typed |
| **Everyday wording** | Relaxes the stiff written register into how people talk |
| **Show a small marker** | A faint *translated* tag after each message |

Hold **Alt** and click any message to see what was originally written.
**Alt+T** turns everything off and on.

### Messages you send

Turn on **Translate what I type before sending** and choose the language to
send in. Then pick what Enter should do:

- **Translate and send it** — one keystroke, the message goes out translated
- **Translate, let me check it first** — the box fills with the translation and
  waits for a second Enter

If you type your language with an English keyboard, turn on **I type my
language in English letters** and say which language it really is. See
[Typing in Latin letters](#typing-in-latin-letters).

### Where it runs

| | |
|---|---|
| **All of Discord** | Every server, every DM |
| **This server only** | The server open when you chose it |
| **This channel only** | That one channel |

Translating a server you already understand is just noise, so scope it.

## How it translates

Five services, none of which need an account or a key. If one goes down or
rate-limits you, the next takes over — translation never simply stops.

| | |
|---|---|
| **Bing** *(default)* | Runs the text through a language model, so casual writing survives |
| **Google** | Fastest, but word for word. Two endpoints with separate limits |
| **MyMemory** | Open API, roughly 5,000 words a day |
| **LibreTranslate** | Fully open source, on a server you run yourself |

The difference the default makes:

```
  ngl this is fire
    Bing      সত্য বলতে এটা দারুন          "honestly, this is great"
    Google    মিথ্যে বলব না এই আগুন        "I won't lie, this fire"
```

A message broken up by a mention or a link is still sent as a single string,
with numbered placeholders where the untranslatable parts sit, so the translator
sees a whole sentence rather than three fragments.

## Typing in Latin letters

Plenty of people write their own language on an English keyboard — Banglish,
Hinglish, Arabizi. Translators handle it badly: *vai dam koto ekhon* is read as
Vietnamese and comes back as *"shoulder?"*.

Switch this on and the text is put back into its own script first, which makes
the language unambiguous:

```
  vai dam koto ekhon  →  ভাই দাম কতো এখন  →  "Brother, how much is the price now?"
```

Not every word is converted. English words inside the sentence stay English,
because that is how people write:

```
  ei project ta scam mone hoy, admin er sathe kotha bolo
    →  এই project তা scam মনে হয়, admin এর সাথে কথা বলো
    →  "This project seems like a scam, talk to the admin."
```

Seventeen languages can be typed this way: Bengali, Hindi, Urdu, Tamil, Telugu,
Malayalam, Kannada, Marathi, Gujarati, Punjabi, Nepali, Sinhala, Arabic,
Persian, Hebrew, Russian and Greek.

## Words that stay as they are

Some words have no translation worth having. Every language just says *fomo*,
and a translator that insists on rendering it drops *"the fear of missing out"*
into the middle of a chat message.

```
  fomo is real rn, everyone aping in   →  fomo এখন সত্যি, সবাই নকল করছে
  gas is insane, floor went to 2 ETH   →  gas পাগল, floor ২ ETH তে চলে গেল
  bro this is sus, might be a rugpull  →  ভাই এটা sus, হতে পারে একটি rugpull
```

This is not a fixed list of words to keep up with. The extension carries a
dictionary of 364,000 English words, and anything the internet invented is
simply not in it — so a Latin word the dictionary does not know is held back
automatically. Words nobody has ever added work on their first appearance:

```
  this is so skibidi ngl     →  এটি খুব skibidi ngl
  bro is delulu fr           →  ভাই delulu সত্যি
```

A short curated list covers the other case — words that *are* ordinary English
but mean something else here: *chill*, *vibe*, *sus*, *mint*, *gas*, *floor*.

## Everyday wording

Translation engines answer in the polite written register, which reads wrong in
a chat window. Nobody types *"আপনি কখন মিন্ট করবেন?"*. The result is relaxed
into ordinary speech: *"তুমি কখন mint করবে?"*.

This is the one part that cannot treat every language alike, because politeness
is built differently in each. Rules ship for the languages where a mechanical
change is reliably correct — Bengali, Hindi, Turkish, Indonesian and Malay mark
politeness in a pronoun or a regular suffix. Spanish, French and German
conjugate the verb to match, so swapping the pronoun alone would produce
something no speaker would write; those pass through untouched.

## Never translated

Bot commands survive byte for byte, incoming and outgoing — `/ban`, `!verify`,
`?help`, `$balance` and the other prefixes bots use. So do links, mentions,
channel references, custom emoji, inline code, fenced code blocks, spoilers,
timestamps, and anything containing a digit.

## Privacy

Message text goes to the translation service you selected, and nowhere else.
No cookies are attached, no account is involved, nothing is logged, and no
analytics of any kind are collected. Your settings live in your own browser.

To keep message text off the network entirely, run LibreTranslate yourself and
point the extension at it:

```bash
docker run -p 5000:5000 libretranslate/libretranslate
```

## Development

```
manifest.json           MV3 manifest
popup/                  settings panel, styled with Discord's own palette
src/common.js           shared defaults and the language list
src/content.js          watches the message list, rewrites text, drives the composer
src/background.js       every network call, the provider chain, the cache
src/slang.js            shorthand expansion and the words held back from translation
src/dictionary.js       Bloom filter lookup over ordinary English
src/dictionary.bin      364k words in 356 KB, built by tools/
src/tone.js             polite register relaxed into everyday speech
test/                   mock Discord page and a DevTools-driven DOM test
tools/                  rebuilds the dictionary from its source list
```

Messages are translated by rewriting individual text nodes rather than replacing
message elements, which keeps mentions, links and formatting intact and keeps
React from noticing. Discord re-renders constantly; a `MutationObserver` catches
that and re-applies from cache, so nothing flickers back.

The *translated* marker and the Alt+click original are drawn with CSS
pseudo-elements. Nothing is inserted into Discord's DOM — React would tear it
out and could crash trying.

### Tests

```bash
npm run serve                                              # mock Discord page
chrome --headless=new --remote-debugging-port=9222 about:blank
npm test
```

`test/mock-discord.html` reproduces Discord's message markup — the same element
ids, the same mix of mentions, links, code and emoji. `test/run-dom-test.js`
drives a real Chrome over the DevTools protocol, injects the content script with
translation stubbed, and checks what actually changed: messages rewritten in
place, a message arriving after load picked up by the observer, and mentions,
links and code untouched.

### Rebuilding the dictionary

```bash
node tools/build-dictionary.js
```

Fetches [dwyl/english-words](https://github.com/dwyl/english-words) and rebuilds
`src/dictionary.bin`. A Bloom filter is used because the answer only has to be
safe in one direction: a real word is never missed, so nothing genuine is
wrongly held back. About two per cent of invented words look real and get
translated anyway.

### Firefox

Replace the service worker declaration in `manifest.json`:

```json
"background": { "scripts": ["src/background.js"] }
```

Then load it through `about:debugging` → **This Firefox** → **Load Temporary
Add-on**.

### Adding things

- **A language** — `DT_LANGUAGES` in `src/common.js`
- **A word that should stay untranslated** — `DT_KEEP_WORDS` in `src/slang.js`,
  only needed for words that are also ordinary English
- **Tone rules for a language** — `DT_TONE` in `src/tone.js`; the bar is that the
  change must never be wrong, not that it catches everything
- **A translation backend** — a function returning `{ text, detected }`,
  registered in `PROVIDERS` in `src/background.js`

## License

MIT — see [LICENSE](LICENSE).

<div align="right"><sub>built by <b>mosfick</b></sub></div>

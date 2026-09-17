# Discord Translator

A browser extension that translates Discord messages where they sit. Messages stay
in place, in order, looking exactly like Discord — the words just arrive in your
language.

It also works the other way round: type in your own language, press Enter, and the
message goes out translated.

No account, no API key, no configuration. Install it and it works.

## What it does

**Messages you read.** Every message in the channel is rewritten into your language
as it arrives. Mentions, links, code blocks, emoji and formatting are left alone —
only the words change. Alt+click a message to see what was originally written.

**Messages you send.** Turn this on and what you type is translated before it
leaves. Write in Bengali, your server reads English. Choose whether it sends
straight away or lets you check the translation first.

**Where it runs.** Three choices, because translating a server you already
understand is just noise:

| Mode | What it covers |
|---|---|
| All of Discord | Every server and every DM |
| This server only | The server that was open when you picked it |
| This channel only | That one channel |

## Installing

The extension is not on the Chrome Web Store, so load it directly:

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and pick this folder.
5. Open Discord in your browser and click the extension icon to choose your language.

Works in any Chromium browser. Firefox needs a small manifest change — see
*Firefox* below.

## Translation backends

Every backend is keyless. If one is down or rate-limits you, the next is tried
automatically, so translation does not simply stop.

| Backend | Notes |
|---|---|
| **Bing** *(default)* | Runs the text through an LLM, so slang and casual writing survive. `ngl this is fire` → *সত্য বলতে এটা দারুন*, not *"this is fire"* with the `ngl` dropped. |
| **Google** | Fastest, but word for word. Two separate endpoints are tried — they have independent rate limits. |
| **MyMemory** | Open API. Roughly 5,000 words a day per address. |
| **LibreTranslate** | Fully open source, but you have to run it: `docker run -p 5000:5000 libretranslate/libretranslate`. Every public instance now wants a key. |

## Typing your language in Latin letters

Plenty of people write their own language with an English keyboard — Banglish,
Hinglish, Arabizi. Translators handle that badly: "vai dam koto ekhon" is read as
Vietnamese and comes back as "shoulder?".

Turn on **I type my language in English letters** and the text is put back into
its own script first, which makes the source unambiguous:

    vai dam koto ekhon  ->  ভাই দাম কতো এখন  ->  "Brother, how much is the price now?"

Not every word is converted. English words inside the sentence stay English,
which is how people actually write:

    ei project ta scam mone hoy, admin er sathe kotha bolo
      ->  এই project তা scam মনে হয়, admin এর সাথে কথা বলো
      ->  "This project seems like a scam, talk to the admin."

Links, mentions, emoji, code and anything with a digit are never touched, and a
message that is plainly ordinary English is left alone entirely. Seventeen
languages can be typed this way; the list is `DT_ROMANIZABLE` in
[`src/common.js`](src/common.js).

## Words that stay as they are

Some words have no translation worth having. Every language says *fomo*, and a
translator that insists on rendering it puts "the fear of missing out" in the
middle of a chat message. Internet and crypto vocabulary is held back before
translation and put back afterwards, so it arrives exactly as typed:

    fomo is real rn, everyone aping in   ->  fomo এখন সত্যি, সবাই নকল করছে
    gas is insane, floor went to 2 ETH   ->  gas পাগল, floor ২ ETH তে চলে গেল
    bro this is sus, might be a rugpull  ->  ভাই এটা sus, হতে পারে একটি rugpull

The list is `DT_KEEP_WORDS` in [`src/slang.js`](src/slang.js).

## Everyday wording

Translation engines answer in the polite written register, which reads wrong in
a chat window — "আপনি কখন মিন্ট করবেন?" is not something anyone types. The
result is relaxed into ordinary speech: "তুমি কখন মিন্ট করবে?".

This is the one part that cannot be language-agnostic, because politeness is
built differently in every language. Rules ship for the languages where a
mechanical change is reliably correct — Bengali, Hindi, Turkish, Indonesian and
Malay mark politeness in a pronoun or a regular suffix. Spanish, French and
German conjugate the verb to match, so swapping the pronoun alone would produce
something no speaker would write; those pass through untouched. Rules live in
[`src/tone.js`](src/tone.js) and the setting can be turned off.

## What is never translated

Bot commands survive byte for byte, incoming and outgoing — `/ban`, `!verify`,
`?help`, `$balance` and the other prefixes bots use. So do links, mentions,
channel references, custom emoji, inline code, fenced code blocks, spoilers and
timestamps.

Because the literal backends drop internet shorthand entirely, text sent to them is
expanded first — `wagmi frens, dyor tho` becomes `we are all going to make it
friends, do your own research though`. Bing does not get this treatment; it reads
the shorthand correctly on its own and the expansion only gets in its way. The word
list is in [`src/slang.js`](src/slang.js) and is easy to add to.

## How it works

```
manifest.json        MV3 manifest
popup/               the settings panel, styled with Discord's own palette
src/common.js        shared defaults and the language list
src/content.js       watches the message list, rewrites text, drives the composer
src/background.js    every network call, the provider chain, the cache
src/slang.js         shorthand expanded, and the words that stay untranslated
src/tone.js          polite register relaxed into everyday speech
test/                a mock Discord page and a DevTools-driven DOM test
assets/make-icons.ps1  cuts assets/icon-source.png into the four sizes
```

Messages are translated by rewriting individual text nodes rather than replacing
message elements, which is what keeps mentions, links and formatting intact and
keeps React from noticing. A message split across several text nodes by a
mention or a link is still sent as one string, with numbered placeholders where
the untranslatable parts sit, so the translator sees a whole sentence rather
than three fragments. Discord re-renders constantly; a MutationObserver
catches that and re-applies from cache, so nothing flickers back to English.

The "translated" marker and the Alt+click original are drawn with CSS pseudo-
elements. Nothing is inserted into Discord's DOM — React would tear it out and
could crash trying.

## Privacy

Message text is sent to whichever backend is selected, and nothing else. No
cookies are attached to those requests, no account is involved, and nothing is
logged or sent anywhere else. Your settings live in your browser's own sync
storage.

To keep message text off the network entirely, run LibreTranslate yourself and
point the extension at it.

## Firefox

Firefox needs `background.scripts` instead of `background.service_worker`:

```json
"background": { "scripts": ["src/background.js"] }
```

Then load it through `about:debugging` → **This Firefox** → **Load Temporary
Add-on**.

## Contributing

Adding a language: the list is `DT_LANGUAGES` in [`src/common.js`](src/common.js) —
a code and a display name.

Adding slang: `DT_SLANG` in [`src/slang.js`](src/slang.js). Only add entries that
are unambiguous. `gg` is deliberately missing because it is a real word in several
languages, and a literal translation beats a confident wrong guess.

Adding a backend: write a function returning `{ text, detected }`, register it in
`PROVIDERS`, and add it to `providerChain`.

## License

MIT. See [LICENSE](LICENSE).

## The icon

[`icons/icon.svg`](icons/icon.svg) is the source; the PNGs are rendered from it.
To change it, edit the SVG and re-render — any browser can do the job:

```bash
chrome --headless --screenshot=master.png --window-size=512,512 icons/icon.svg
```

then downscale `master.png` to 16, 32, 48 and 128 px.


## Tests

    node test/serve.js 8899 &
    chrome --headless=new --remote-debugging-port=9222 about:blank &
    node test/run-dom-test.js

[`test/mock-discord.html`](test/mock-discord.html) reproduces Discord's message
markup — the same element ids, the same mix of mentions, links, code and emoji.
[`test/run-dom-test.js`](test/run-dom-test.js) drives a real Chrome over the
DevTools protocol, injects the content script into that page with translation
stubbed, and checks what changed: that messages are rewritten in place, that a
message arriving after load is picked up, and that mentions, links and code come
through untouched.

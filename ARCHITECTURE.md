# Architecture

How the extension is put together, and why it is put together that way.

---

## Parts

| File | Runs in | Responsibility |
|---|---|---|
| `src/content.js` | the Discord tab | Finds message text, rewrites it, intercepts the composer |
| `src/background.js` | service worker | Every network call, provider fallback, cache |
| `src/common.js` | both, and the popup | Defaults, language list, URL parsing |
| `src/slang.js` | service worker | Respellings, expansions, words held back |
| `src/dictionary.js` | service worker | Bloom filter lookup over `dictionary.bin` |
| `src/tone.js` | service worker | Polite register relaxed into speech |
| `popup/` | popup page | Reads and writes `chrome.storage.sync` |

The split is forced by the platform: a content script on `discord.com` cannot
reach a translation host, so every request goes through the service worker over
`chrome.runtime.sendMessage`.

---

## Reading a message

```
MutationObserver
      │
      ▼
scan(document) ──▶ every [id^="message-content-"]
      │
      ▼
looksLikeCommand?  ── yes ─▶ skip entirely
      │ no
      ▼
collectTextNodes ──▶ TreeWalker, rejecting CODE PRE A IMG TIME
      │              and any ancestor matching mention|emoji|timestamp
      ▼
one node? ──▶ translateOne
many?     ──▶ translateTogether   (joined with [1] [2] placeholders)
      │
      ▼
sendMessage → service worker → write(node, original, translated)
```

`scan` is debounced at 120 ms and re-runs on every mutation batch, because
Discord virtualises the message list — nodes are created and destroyed as you
scroll.

### Surviving React

Three problems, three answers.

**React overwrites the text.** It re-renders and puts the original back. The
same `MutationObserver` sees that and re-applies, this time from `localCache`,
so there is no request and no visible flicker. `ourText` holds everything the
extension has written so those values are never re-translated.

**React removes injected elements.** So nothing is injected. The *translated*
marker and the Alt+click original are `::after` and `::before` pseudo-elements
driven by `data-dt-translated` and `data-dt-original` attributes. Attributes
survive re-render better than children, and if they are stripped the next scan
puts them back. An injected `<span>` would be torn out and can crash React's
reconciler on the way.

**Formatting is separate nodes.** Rewriting whole elements would destroy
mentions, links and emoji. Only text nodes are touched, so everything else is
never visited at all.

### Whole messages, not fragments

`hey @Alice the floor moved, check <link> when you can` is three text nodes with
two elements wedged between them. Translated separately, the translator never
sees a sentence.

`translateTogether` joins them with numbered markers:

```
  hey [1] the floor moved, check [2] when you can
```

sends that as one string, and splits the result back on `/\[(\d+)\]/`. If the
translator has moved the markers — some do — the piece count no longer matches
the node count, and it falls back to translating each node on its own.

---

## Sending a message

```
keydown Enter (capture phase)
      │
      ├─ command, empty, IME composing, or already translated ─▶ let through
      │
      ▼
preventDefault + stopImmediatePropagation
      │
      ▼
translate(text, outgoingTarget, romanizeFrom)
      │
      ▼
replaceComposerText ──▶ execCommand('insertText')
      │
      ├─ mode 'send'    ─▶ synthesise Enter, guarded by bypassNextEnter
      └─ mode 'preview' ─▶ store the result on the box; the next Enter sends it
```

The composer is a Slate editor, so its value cannot be assigned. Selecting the
contents and calling `document.execCommand('insertText')` fires the
`beforeinput`/`input` events Slate needs to stay in sync — deprecated, and still
the only approach that works.

`bypassNextEnter` keeps the synthesised Enter from re-entering the handler.
`dataset.dtDone` does the same job for preview mode, where the user's own second
Enter would otherwise translate the translation.

---

## The translation pipeline

Order matters more than any individual step.

```
raw text
   │
   ├─ 1. transliterate     only if romanizeFrom, Latin-script, and not plain English
   │
   ├─ 2. protect           hold back what must not change   →  {1} {2} {3}
   │
   ├─ 3. respell           wen → when, cuz → because         every backend
   │
   ├─ 4. expand            ngl → not going to lie            literal backends only
   │
   ├─ 5. translate         provider chain, with retry
   │
   ├─ 6. restore           {1} {2} {3} → the held-back words
   │
   └─ 7. relax             polite register → everyday speech
```

**Why protect before respell.** A protected word is already `{1}` by the time
the respeller runs, so a kept word is never rewritten by a spelling rule.

**Why respell for every backend.** A respelling is not slang — the translator
simply does not know the word. `wen mint?` comes back as *"you mint?"* or
*"white mint?"* depending on the day. The idiom expansion is different: the
default backend reads `ngl` correctly on its own and expanding it first only
gets in the way, so that step is limited to the word-for-word backends.

**Why relax last.** It rewrites the output language, so it has to run after the
placeholders are gone or it would match inside them.

### What `protect` holds back

Two mechanisms, in this order:

1. **Patterns** — code fences, links, spoilers, mentions, channel references,
   custom emoji, inline code, acronyms, anything containing a digit.
2. **Words** — `DT_KEEP_WORDS` first, then every Latin word the dictionary does
   not recognise.

The second is the interesting one. A word absent from an English dictionary was
invented by the internet, and is one no translator will render well, so it is
held back automatically. This is what makes new vocabulary work without anyone
maintaining a list.

The exception: shorthand that stands for a whole sentence. `brb`, `gtg` and
`ttyl` are absent from any dictionary too, but they very much want translating,
so anything `DT_SLANG` knows is handed to the translator instead.

`DT_KEEP_WORDS` exists for the cases the dictionary cannot decide — words that
*are* ordinary English but mean something else here (*chill*, *vibe*, *gas*,
*floor*), and greetings that a 370k-word dictionary happens to contain as
obscure entries (*gm*, *gn*, *wen*).

---

## The dictionary

`src/dictionary.bin` is a Bloom filter over 364,221 English words in 356 KB,
built from [dwyl/english-words](https://github.com/dwyl/english-words) by
`tools/build-dictionary.js`.

```
  offset  bytes  meaning
  ──────────────────────────────────────
  0       4      "DTD1"
  4       4      bit count, little-endian
  8       4      hash count
  12      …      the bit array
```

Five indices per word, derived from two 32-bit hashes — FNV-1a and djb2 — using
`h1 + i·h2`. Eight bits per word gives roughly two per cent false positives.

A Bloom filter is the right shape because the error only runs one way. A real
word is **never** missed, so a genuine word is never wrongly held back. The cost
is that about one invented word in fifty looks real and gets translated anyway,
which is a much smaller problem than the reverse.

The service worker loads it once through `chrome.runtime.getURL` and keeps it in
memory. If the file cannot be read, `dtIsRealWord` answers `true` for
everything, which degrades to the curated list alone rather than holding back
every word in the message.

---

## Backends

```
providerChain(engine) = [chosen, bing, google, mymemory, libre]   deduplicated
```

Each is tried twice for a retryable failure — 429 or 5xx — then the chain moves
on. Anything else moves on immediately, since a malformed request will not
succeed on a second attempt.

| Provider | Note |
|---|---|
| `viaBing` | Scrapes a one-hour token from the public translator page. Answers 401 without a browser `User-Agent`; Chrome attaches one to extension requests automatically, which is why these calls fail when replayed from curl |
| `viaGoogle` | Two endpoints with independent rate limits, tried in order — when `translate.googleapis.com` starts answering 429, `clients5.google.com` usually still works |
| `viaMyMemory` | No auto-detect, so an unknown source is assumed to be English |
| `viaLibre` | Only in the chain when a server address is configured |

Every request is sent with `credentials: 'omit'`, so no cookies are attached to
any of them.

---

## Caching

Three layers, each answering a different question.

| Layer | Lives in | Keyed on | Purpose |
|---|---|---|---|
| `localCache` | content script | original text | Re-apply instantly when React reverts a message |
| `ourText` | content script | translated text | Never re-translate our own output |
| LRU, 3000 entries | service worker | engine, source, target, romanize, text | Avoid repeat requests across messages and tabs |

The service worker cache is lost when the worker sleeps. That is deliberate — it
costs one extra request for text already seen, and nothing else.

---

## Scope

`scopeAllows()` compares the current URL against an anchor captured when the
user picked a scope in the popup. The popup reads the active tab's URL, so
"this channel only" means the channel that was open at that moment.

The URL is polled every 500 ms, because Discord is a single-page app and the
channel changes without a navigation event. Turning the scope off reverts every
applied translation from the `applied` array.

---

## Known limits

- **Discord's class names are hashed per build.** Message and embed selectors
  are matched on element ids and class prefixes, which is as stable as it gets,
  but a large enough redesign will need them updated. They are all at the top of
  `content.js`.
- **Transliteration mishears sometimes.** `korcho` comes back as `খরচ`
  (*expense*) rather than `করছো` (*are doing*). That is the transliteration
  service, not something a word list can fix.
- **A backend can move the placeholders.** The piece count is checked and the
  message falls back to per-node translation, but that message is then
  translated in fragments.
- **Roughly 2% of invented words look real** to the Bloom filter and get
  translated. Adding them to `DT_KEEP_WORDS` fixes an individual case.

---

## Testing

`test/mock-discord.html` reproduces Discord's markup — the same element ids, the
same mix of mentions, links, code and emoji. `test/run-dom-test.js` drives a
real Chrome over the DevTools protocol, injects `common.js` and `content.js`
with `chrome.*` stubbed and translation replaced by a marker, then asserts what
changed in the DOM.

Translation is stubbed on purpose. The backends are verified separately; what
only a browser can exercise is which nodes get rewritten and what survives.

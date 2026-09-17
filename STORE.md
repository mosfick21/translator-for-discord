# Chrome Web Store listing

Everything the submission form asks for, written out. Copy each block into the
matching field at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).

Registering as a developer costs a one-time $5.

---

## Name

```
Translator for Discord
```

Store policy rejects a name that reads as though the extension comes from
Discord. Putting the product first is the standard way round it.

## Summary (132 characters max)

```
Read every Discord message in your own language, and send yours in theirs. No account, no API key.
```

## Description

```
Discord messages translated where they sit. Nothing moves, nothing is added —
the words just arrive in your language.

READING
Every message in the channel is rewritten as it appears. Mentions, links, code
blocks, emoji and formatting are untouched; only the words change. Alt+click any
message to see what was originally written.

SENDING
Type in your own language and press Enter — the message goes out translated.
Write in Bengali, your server reads English. You can have it send straight away,
or show you the translation first.

If you type your language in English letters — Banglish, Hinglish, Arabizi —
turn that on and it is understood too. "vai dam koto ekhon" is sent as "Brother,
how much is the price now?" rather than being mistaken for Vietnamese.

WHERE IT RUNS
All of Discord, one server, or a single channel. Translating a server you
already understand is just noise.

SLANG
The default backend reads casual writing the way a person does. "ngl this is
fire" comes through meaning what it means, instead of losing the "ngl" and
translating "fire" literally.

NO SETUP
No account, no sign-up, no API key, nothing to paste in. Install it, pick your
language, done. If a translation service is down or rate-limits you, the next
one takes over automatically.

OPEN SOURCE
Every line is readable at <repository URL>. MIT licensed.
```

## Category

`Communication` — or `Productivity` if Communication is crowded.

## Language

English (the interface is in English; the translations are not).

---

## Permission justifications

The console asks for one per permission, and a vague answer is the most common
reason a submission is sent back. Keep these short and specific.

**`storage`**
```
Stores the user's own settings: target language, whether outgoing translation is
on, and which channel or server the extension is limited to. Nothing else is
stored and nothing leaves the browser.
```

**`tabs`**
```
The settings popup reads the URL of the active tab, and only that tab, to learn
which Discord server and channel is open. That is what makes "translate this
channel only" possible. No browsing history is read or retained.
```

**`host_permissions` — discord.com**
```
The extension's entire purpose is to translate messages on discord.com, which
requires reading and rewriting message text on that page.
```

**`host_permissions` — bing.com, translate.googleapis.com, api.mymemory.translated.net**
```
These are the translation services. Message text is sent to whichever one the
user has selected so that it can be translated, and the translation is sent
back. No credentials or cookies are attached to these requests.
```

**`host_permissions` — inputtools.google.com**
```
Used only when the user turns on "I type my language in English letters". It
converts the typed text back into its own script before translating, which is
what makes romanised input work correctly.
```

**Remote code**: answer **No**. Everything executes from files in the package;
the network is used for translation data only.

---

## Privacy

**Single purpose**
```
Translating Discord messages.
```

**Data collected**: tick only **Website content**, and then:
```
Message text is sent to the selected translation service so it can be
translated. It is not stored, not logged, and not sent anywhere else. Settings
stay in the browser's own storage.
```

Tick all three certifications — the extension does not sell data, does not use it
for unrelated purposes, and does not use it to judge creditworthiness.

A privacy policy URL is required once any data is declared. The *Privacy* section
of README.md is enough; link to it on GitHub.

---

## Images

| Asset | Size | Required |
|---|---|---|
| Store icon | 128×128 | yes |
| Screenshot | 1280×800 or 640×400 | yes, at least one |
| Small promo tile | 440×280 | only to be featured |
| Marquee promo tile | 1400×560 | no |

Screenshots have to be real captures of the extension running — generated images
get the submission rejected. Load the extension, open a busy channel, and take
three: messages mid-translation, the settings popup, and a message you typed in
one language going out in another.


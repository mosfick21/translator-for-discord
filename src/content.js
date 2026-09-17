/* Runs inside discord.com. Rewrites message text in place and, optionally,
   translates what you type before it is sent. */

(function () {
  'use strict';

  var settings = Object.assign({}, DT_DEFAULTS);

  // ---------------------------------------------------------------- selectors
  // Discord's class names are hashed per build, so match on the stable bits:
  // element ids for messages, and class *prefixes* for embeds.
  var MESSAGE_CONTENT = 'div[id^="message-content-"], div[class*="messageContent"]';

  /* The editor itself, then the box around it. Discord has moved the composer
     in and out of a <form> over the years, so neither is assumed. */
  var EDITOR = [
    '[data-slate-editor="true"][role="textbox"]',
    'div[role="textbox"][contenteditable="true"]',
    'div[role="textbox"]'
  ].join(',');

  function findEditor() {
    return document.querySelector(EDITOR);
  }

  function composerBox(editor) {
    return editor.closest('form') ||
           editor.closest('[class*="channelTextArea"]') ||
           editor.closest('[class*="textArea"]') ||
           editor.parentElement;
  }
  var EMBED_PARTS = [
    '[class*="embedTitle"]',
    '[class*="embedDescription"]',
    '[class*="embedFieldName"]',
    '[class*="embedFieldValue"]',
    '[class*="embedAuthorName"]',
    '[class*="embedFooterText"]'
  ].join(',');

  // Never touch what is inside these — URLs, code, mentions and emoji must
  // survive untouched or the message stops working.
  var SKIP_TAGS = { CODE: 1, PRE: 1, A: 1, IMG: 1, SVG: 1, BUTTON: 1, TIME: 1 };

  /* Names are not words. A username, nickname or role label that happens to sit
     inside message content — a reply preview, a join notice — must come through
     exactly as it is, or people stop being findable by the name they chose. */
  var SKIP_CLASS = new RegExp([
    'mention', 'emoji', 'timestamp', 'codeBlock', 'inlineCode',
    'blockquoteDivider', 'username', 'nickname', 'displayName', 'author',
    'botTag', 'roleName', 'memberName', 'tag_', 'headerText'
  ].join('|'), 'i');

  // ------------------------------------------------------------------- state
  var localCache = new Map();        // original text -> translated text
  var ourText = new Set();           // everything we have written into the page
  var applied = [];                  // { node, original } so we can undo
  var pending = new Set();           // originals currently in flight
  var lastHref = location.href;
  var active = false;                // does the current channel match the scope?

  // ------------------------------------------------------------------- queue
  // Google's free endpoint rate-limits hard, so never fire more than a few at once.
  var MAX_CONCURRENT = 4;
  var queue = [];
  var running = 0;

  function enqueue(job) {
    return new Promise(function (resolve, reject) {
      queue.push({ job: job, resolve: resolve, reject: reject });
      pump();
    });
  }

  function pump() {
    while (running < MAX_CONCURRENT && queue.length) {
      var item = queue.shift();
      running++;
      item.job().then(item.resolve, item.reject).then(function () {
        running--;
        pump();
      });
    }
  }

  function translate(text, target, source, romanizeFrom) {
    return enqueue(function () {
      return new Promise(function (resolve) {
        chrome.runtime.sendMessage(
          {
            type: 'dt:translate',
            text: text,
            target: target,
            // 'auto' is sent as null so the backend does its own detection.
            source: source && source !== 'auto' ? source : null,
            romanizeFrom: romanizeFrom || null
          },
          function (res) {
            if (chrome.runtime.lastError || !res || !res.ok) resolve(null);
            else resolve(res);
          }
        );
      });
    });
  }

  // ------------------------------------------------------------------- scope
  function scopeAllows() {
    if (!settings.enabled) return false;
    var here = dtParseLocation(location.href);
    if (settings.scope === 'channel') {
      return !!settings.anchor.channelId && here.channelId === settings.anchor.channelId;
    }
    if (settings.scope === 'server') {
      return !!settings.anchor.guildId && here.guildId === settings.anchor.guildId;
    }
    return true;
  }

  // ------------------------------------------------------------ text walking
  function collectTextNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var value = node.nodeValue;
        if (!value || !value.trim()) return NodeFilter.FILTER_REJECT;
        // Pure punctuation / numbers are not worth a request.
        if (!/[\p{L}]/u.test(value)) return NodeFilter.FILTER_REJECT;
        if (ourText.has(value)) return NodeFilter.FILTER_REJECT;

        for (var el = node.parentElement; el && el !== root.parentElement; el = el.parentElement) {
          if (SKIP_TAGS[el.tagName]) return NodeFilter.FILTER_REJECT;
          var cls = typeof el.className === 'string' ? el.className : '';
          if (cls && SKIP_CLASS.test(cls)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function write(node, original, translated) {
    if (!node.isConnected || translated === original) return;
    ourText.add(translated);
    node.nodeValue = translated;
    applied.push({ node: node, original: original });

    var host = node.parentElement && node.parentElement.closest(MESSAGE_CONTENT + ',' + EMBED_PARTS);
    if (host) {
      host.setAttribute('data-dt-translated', '1');
      host.removeAttribute('data-dt-working');
      if (!host.hasAttribute('data-dt-original')) {
        host.setAttribute('data-dt-original', original);
        host.setAttribute('title', 'Original: ' + original);
      }
    }
  }

  /* A message like "hey @Alice the floor moved, check <link> when you can" is
     three text nodes with a mention and a link wedged between them. Translating
     each piece on its own gives the translator no sentence to work with, so the
     pieces are stitched together with numbered placeholders, sent as one, and
     split apart again afterwards. */
  var PLACEHOLDER = /\[(\d+)\]/g;

  function translateOne(node) {
    var original = node.nodeValue;

    var cached = localCache.get(original);
    if (cached !== undefined) {
      if (cached !== null) write(node, original, cached);
      return;
    }
    if (pending.has(original)) return;
    pending.add(original);

    translate(original, settings.target, settings.source).then(function (res) {
      pending.delete(original);
      if (!res) return;
      // Already in the target language? Leave the message exactly as it is.
      if (res.detected === settings.target) {
        localCache.set(original, null);
        return;
      }
      localCache.set(original, res.text);
      write(node, original, res.text);
    });
  }

  function translateTogether(nodes) {
    var originals = nodes.map(function (n) { return n.nodeValue; });
    var joined = originals[0];
    for (var i = 1; i < originals.length; i++) joined += '[' + i + ']' + originals[i];

    function apply(translated) {
      var pieces = translated.split(PLACEHOLDER).filter(function (p, idx) {
        return idx % 2 === 0;        // split() interleaves the captured numbers
      });
      // A translator is free to move the placeholders around, and then the
      // pieces no longer line up with the nodes. Fall back to one at a time.
      if (pieces.length !== nodes.length) {
        nodes.forEach(translateOne);
        return;
      }
      nodes.forEach(function (node, idx) { write(node, originals[idx], pieces[idx]); });
    }

    var cached = localCache.get(joined);
    if (cached !== undefined) {
      if (cached !== null) apply(cached);
      return;
    }
    if (pending.has(joined)) return;
    pending.add(joined);

    translate(joined, settings.target, settings.source).then(function (res) {
      pending.delete(joined);
      if (!res) return;
      if (res.detected === settings.target) {
        localCache.set(joined, null);
        return;
      }
      localCache.set(joined, res.text);
      apply(res.text);
    });
  }

  /* ─────────────────────────────────────────────────────────────── buttons
     Both buttons live in a layer of our own, appended to <body> and positioned
     over the page from the coordinates of whatever they belong to.

     Putting them inside Discord's own markup does not work: React owns that
     tree, removes anything it did not create, and the composer's button row is
     rebuilt often enough that an injected node never survives. A sibling of the
     app root is invisible to React, so a plain <button> can be used — with a
     real click, a real hover, and a real icon. */

  var layer = null;
  var composerButton = null;
  var pool = [];               // one message button per message on screen

  var ICON = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">' +
    '<path d="M12.87 15.07l-2.54-2.51.03-.03A17.5 17.5 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17' +
    'A15.4 15.4 0 019.5 11.2 15.9 15.9 0 017.4 8H5.4a17.9 17.9 0 002.8 4.5l-3.4 3.4L6.2 17.3' +
    'l3.4-3.4 2.1 2.1.77-2.03zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33' +
    'L19.12 17h-3.24z"/></svg>');

  /* Artwork of our own is used when it is in the package, and the plain glyph
     above stands in until it is. Checking with an Image means a missing file
     leaves a working button rather than a blank one. */
  function makeButton(className, title, artwork) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.style.backgroundImage = 'url("' + ICON + '")';

    var url = chrome.runtime.getURL('assets/' + artwork);
    var probe = new Image();
    probe.onload = function () {
      b.style.backgroundImage = 'url("' + url + '")';
      b.classList.add('dt-btn-art');
    };
    probe.src = url;

    return b;
  }

  function ensureLayer() {
    if (layer && layer.isConnected) return;

    layer = document.createElement('div');
    layer.className = 'dt-layer';

    composerButton = makeButton('dt-btn dt-btn-send', 'Translate and send', 'icon-send.png');
    composerButton.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var box = findEditor();
      if (box) translateAndSend(box);
    });

    layer.appendChild(composerButton);
    document.body.appendChild(layer);
    pool.length = 0;
  }

  function newMessageButton() {
    var b = makeButton('dt-btn dt-btn-message', 'Translate this message', 'icon-translate.png');
    b.addEventListener('mousedown', function (e) {
      // mousedown rather than click: Discord tears the hover state down on mouseup.
      e.preventDefault();
      e.stopPropagation();
      var host = b.dtTarget;
      if (!host || !host.isConnected) return;
      host.setAttribute('data-dt-working', '1');
      handleBlock(host, true);
      b.style.display = 'none';
    });
    layer.appendChild(b);
    return b;
  }

  /* A button for every message on screen that has not been translated yet.
     They sit to the right of the text, inside the column, so they never land on
     the avatars or outside the chat area. */
  function placeMessageButtons() {
    if (settings.mode !== 'tap') {
      for (var h = 0; h < pool.length; h++) pool[h].style.display = 'none';
      return;
    }

    var nodes = document.querySelectorAll(MESSAGE_CONTENT);
    var shown = 0;

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hasAttribute('data-dt-translated')) continue;

      var r = el.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > window.innerHeight) continue;

      // Keep it inside the message column rather than wherever the text ends.
      var row = el.closest('li') || el.parentElement;
      var limit = row ? row.getBoundingClientRect().right - 32 : r.right + 6;
      var left = Math.min(r.right + 8, limit);
      if (left < r.left) left = r.left;

      var btn = pool[shown] || (pool[shown] = newMessageButton());
      btn.dtTarget = el;
      btn.style.display = 'block';
      btn.style.left = Math.round(left) + 'px';
      btn.style.top = Math.round(r.top) + 'px';
      shown++;
    }

    for (var j = shown; j < pool.length; j++) pool[j].style.display = 'none';
  }

  /* The send button sits just left of Discord's own composer buttons. */
  function placeComposerButton() {
    if (!composerButton) return;

    var editor = findEditor();
    var form = editor && composerBox(editor);
    if (!form) { composerButton.style.display = 'none'; return; }

    var box = form.getBoundingClientRect();
    if (!box.width || !box.height) { composerButton.style.display = 'none'; return; }

    // Line up with the row of gift and emoji buttons when there is one, so the
    // three read as one set rather than ours floating loose. Their container is
    // named differently across builds, so the leftmost button in the composer
    // that sits to the right of the text is used instead of a class name.
    var right = box.right - 10;
    var buttons = form.querySelectorAll('button, [role="button"]');
    for (var i = 0; i < buttons.length; i++) {
      var r = buttons[i].getBoundingClientRect();
      if (r.width && r.left > box.left + box.width / 2 && r.left - 6 < right) {
        right = r.left - 6;
      }
    }

    composerButton.style.display = 'block';
    composerButton.style.left = Math.round(right - 34) + 'px';
    composerButton.style.top = Math.round(box.top + (box.height - 34) / 2) + 'px';
    composerButton.dataset.dtLang = settings.outgoingTarget.toUpperCase();
    composerButton.title = 'Translate and send in ' +
      settings.outgoingTarget.toUpperCase();
  }

  function refreshButtons() {
    if (!active) {
      if (layer) layer.style.display = 'none';
      return;
    }
    ensureLayer();
    layer.style.display = '';
    placeComposerButton();
    placeMessageButtons();
  }

  /* Anything that moves the page moves the buttons with it — but measuring on
     every scroll event is what makes a page feel heavy, so it happens once a
     frame at most. */
  var framePending = false;
  function refreshSoon() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(function () {
      framePending = false;
      refreshButtons();
    });
  }

  window.addEventListener('scroll', refreshSoon, true);
  window.addEventListener('resize', refreshSoon);
  setInterval(refreshButtons, 600);

  /* Bot commands have to survive byte for byte or they stop working: a slash
     command, or one of the prefixes bots use, followed immediately by a word.
     The letter right after the prefix is what separates "!verify" from "!!!"
     and "$100", and the space check keeps "- a list item" and "> a quote" out
     of it. */
  var COMMAND = /^[/!?$;%&+.][a-zA-Z][\w-]*(\s|$)/;

  function looksLikeCommand(text) {
    return COMMAND.test(text.trim());
  }

  function handleBlock(root, force) {
    if (looksLikeCommand(root.textContent || '')) return;

    // On tap, a message waits for its button rather than translating itself.
    if (settings.mode === 'tap' && !force) return;

    var nodes = collectTextNodes(root);
    if (!nodes.length) return;
    if (nodes.length === 1) translateOne(nodes[0]);
    else translateTogether(nodes);
  }

  function scan(root) {
    if (!active) return;
    var scope = root && root.querySelectorAll ? root : document;

    var contents = scope.querySelectorAll(MESSAGE_CONTENT);
    for (var i = 0; i < contents.length; i++) handleBlock(contents[i]);

    if (scope.matches && scope.matches(MESSAGE_CONTENT)) handleBlock(scope);

    var embeds = scope.querySelectorAll(EMBED_PARTS);
    for (var j = 0; j < embeds.length; j++) handleBlock(embeds[j]);
  }

  function revertAll() {
    for (var i = 0; i < applied.length; i++) {
      var rec = applied[i];
      if (rec.node.isConnected) rec.node.nodeValue = rec.original;
    }
    applied.length = 0;
    ourText.clear();
    document.querySelectorAll('[data-dt-translated]').forEach(function (el) {
      el.removeAttribute('data-dt-translated');
      el.removeAttribute('data-dt-original');
      el.removeAttribute('title');
    });
  }

  // -------------------------------------------------------------- observer
  var scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scan(document);
      refreshButtons();
    }, 120);
  }

  var observer = new MutationObserver(function (records) {
    if (!active) return;

    for (var i = 0; i < records.length; i++) {
      if (records[i].addedNodes.length || records[i].type === 'characterData') {
        scheduleScan();
        return;
      }
    }
  });

  // ------------------------------------------------- Alt+click to see original
  document.addEventListener('click', function (e) {
    if (!e.altKey) return;
    var host = e.target.closest && e.target.closest('[data-dt-translated]');
    if (!host) return;
    e.preventDefault();
    host.classList.toggle('dt-show-original');
  }, true);

  // -------------------------------------------------------- outgoing messages
  function composerOf(target) {
    if (!target || !target.closest) return null;
    return target.closest('div[role="textbox"][data-slate-editor="true"]') ||
           target.closest('div[role="textbox"]');
  }

  /* Getting text into the composer is the one part that cannot be done the
     obvious way: it is a Slate editor, so its value is held in JavaScript and
     assigning to the DOM changes nothing that gets sent.

     execCommand is deprecated and still the only thing that works, because it
     raises the same beforeinput/input events a keystroke does, which is what
     Slate listens to. Two ways of selecting first, because selectAll is refused
     in some builds and a Range is ignored in others.

     Returns whether the box actually ended up holding the text. */
  function replaceComposerText(box, text) {
    box.focus();

    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(box);
    sel.removeAllRanges();
    sel.addRange(range);

    document.execCommand('insertText', false, text);
    if ((box.textContent || '').trim() === text.trim()) return true;

    // Second attempt: let the browser work out the selection itself.
    box.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    return (box.textContent || '').trim() === text.trim();
  }

  function pressEnter(box) {
    var init = {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true, composed: true
    };
    box.dispatchEvent(new KeyboardEvent('keydown', init));
    box.dispatchEvent(new KeyboardEvent('keypress', init));
    box.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  /* Translate whatever is in the box and send it. Only the button does this —
     Enter is left alone, so a message is never sent in a language the user did
     not deliberately ask for. */
  /* Flash the button so the outcome is never silent. Nothing happening and
     something failing look identical otherwise, which is the worst way for a
     button to behave. */
  function flash(state) {
    if (!composerButton) return;
    composerButton.dataset.dtState = state;
    setTimeout(function () { delete composerButton.dataset.dtState; }, 1400);
  }

  function translateAndSend(box) {
    var text = (box.textContent || '').trim();
    if (!text || box.dataset.dtBusy === '1') return;
    if (looksLikeCommand(text)) { flash('skip'); return; }

    box.dataset.dtBusy = '1';
    if (composerButton) composerButton.dataset.dtState = 'busy';

    // The language being written is named, not guessed: it tells the worker
    // both what to translate from and — when this turns out to be Latin letters
    // standing in for another script — what to put it back into.
    translate(text, settings.outgoingTarget, settings.outgoingSource,
              settings.outgoingSource)
      .then(function (res) {
        delete box.dataset.dtBusy;

        if (!res || !res.text) { flash('fail'); return; }
        if (res.text.trim() === text) { flash('same'); return; }

        if (!replaceComposerText(box, res.text)) {
          // The text is still the user's own, so nothing is sent — pressing
          // Enter now would post the untranslated message.
          flash('fail');
          return;
        }

        flash('ok');
        // Slate has the translation; ask Discord to send it. If the synthetic
        // key is ignored the translation is still sitting in the box, so the
        // user only has to press Enter.
        pressEnter(box);
      });
  }

  // ------------------------------------------------------------------- wiring
  function applyState() {
    var next = scopeAllows();
    if (next === active) {
      if (active) scheduleScan();
      return;
    }
    active = next;
    refreshButtons();
    if (active) {
      observer.observe(document.body, {
        childList: true, subtree: true, characterData: true
      });
      scan(document);
    } else {
      observer.disconnect();
      revertAll();
    }
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync') return;
    var languageChanged = false;
    Object.keys(changes).forEach(function (key) {
      if (key in settings) settings[key] = changes[key].newValue;
      if (key === 'target' || key === 'skipSameLanguage') languageChanged = true;
    });
    if (languageChanged) {
      localCache.clear();
      revertAll();
    }
    applyState();
  });

  // Discord is a single-page app, so the channel can change without a reload.
  setInterval(function () {
    if (location.href === lastHref) return;
    lastHref = location.href;
    applyState();
  }, 500);

  dtLoadSettings().then(function (loaded) {
    settings = loaded;
    applyState();
  });
})();

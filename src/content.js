/* Runs inside discord.com. Rewrites message text in place and, optionally,
   translates what you type before it is sent. */

(function () {
  'use strict';

  var settings = Object.assign({}, DT_DEFAULTS);

  // ---------------------------------------------------------------- selectors
  // Discord's class names are hashed per build, so match on the stable bits:
  // element ids for messages, and class *prefixes* for embeds.
  var MESSAGE_CONTENT = 'div[id^="message-content-"]';
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
  var SKIP_CLASS = /mention|emoji|timestamp|codeBlock|inlineCode|blockquoteDivider/i;

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

  function translate(text, target, romanizeFrom) {
    return enqueue(function () {
      return new Promise(function (resolve) {
        chrome.runtime.sendMessage(
          { type: 'dt:translate', text: text, target: target, romanizeFrom: romanizeFrom || null },
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

    translate(original, settings.target).then(function (res) {
      pending.delete(original);
      if (!res) return;
      // Already in the target language? Leave the message exactly as it is.
      if (settings.skipSameLanguage && res.detected === settings.target) {
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

    translate(joined, settings.target).then(function (res) {
      pending.delete(joined);
      if (!res) return;
      if (settings.skipSameLanguage && res.detected === settings.target) {
        localCache.set(joined, null);
        return;
      }
      localCache.set(joined, res.text);
      apply(res.text);
    });
  }

  /* Bot commands have to survive byte for byte or they stop working: a slash
     command, or one of the prefixes bots use, followed immediately by a word.
     The letter right after the prefix is what separates "!verify" from "!!!"
     and "$100", and the space check keeps "- a list item" and "> a quote" out
     of it. */
  var COMMAND = /^[/!?$;%&+.][a-zA-Z][\w-]*(\s|$)/;

  function looksLikeCommand(text) {
    return COMMAND.test(text.trim());
  }

  function handleBlock(root) {
    if (looksLikeCommand(root.textContent || '')) return;

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

    if (settings.translateEmbeds) {
      var embeds = scope.querySelectorAll(EMBED_PARTS);
      for (var j = 0; j < embeds.length; j++) handleBlock(embeds[j]);
    }
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
  var bypassNextEnter = false;

  function composerOf(target) {
    if (!target || !target.closest) return null;
    return target.closest('div[role="textbox"][data-slate-editor="true"]') ||
           target.closest('div[role="textbox"]');
  }

  function replaceComposerText(box, text) {
    box.focus();
    var range = document.createRange();
    range.selectNodeContents(box);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    // execCommand fires the beforeinput/input events Slate needs to stay in sync.
    document.execCommand('insertText', false, text);
  }

  function pressEnter(box) {
    var init = {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true, composed: true
    };
    bypassNextEnter = true;
    box.dispatchEvent(new KeyboardEvent('keydown', init));
    box.dispatchEvent(new KeyboardEvent('keypress', init));
    box.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.isComposing || e.keyCode === 229) return;          // IME still composing
    if (bypassNextEnter) { bypassNextEnter = false; return; }
    if (!settings.enabled || !settings.outgoingEnabled || !scopeAllows()) return;

    var box = composerOf(e.target);
    if (!box) return;

    var text = (box.textContent || '').trim();
    if (!text) return;
    if (looksLikeCommand(text)) return;                       // /ban, !verify, ?help
    if (box.dataset.dtBusy === '1') return;                   // already working on it

    // In preview mode the box now holds our own translation, and this Enter is
    // the user approving it. Send it as it stands instead of translating twice.
    if (box.dataset.dtDone === text) {
      delete box.dataset.dtDone;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    box.dataset.dtBusy = '1';
    // If the user types their language in Latin letters, it is put back into
    // its own script before translating — otherwise "vai dam koto ekhon" gets
    // read as Vietnamese.
    var romanizeFrom = settings.romanized ? settings.romanizedLang : null;

    translate(text, settings.outgoingTarget, romanizeFrom).then(function (res) {
      delete box.dataset.dtBusy;
      var out = res && res.text ? res.text : text;            // on failure, send what was typed
      if (out !== text) replaceComposerText(box, out);
      if (settings.outgoingMode === 'send') {
        pressEnter(box);
      } else {
        box.dataset.dtDone = out;                             // next Enter just sends it
      }
    });
  }, true);

  // ------------------------------------------------------------------- wiring
  function applyState() {
    // CSS cannot read settings, so mirror the badge preference onto <html>.
    document.documentElement.setAttribute('data-dt-badge', settings.showBadge ? '1' : '0');

    var next = scopeAllows();
    if (next === active) {
      if (active) scheduleScan();
      return;
    }
    active = next;
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

/* Reads and writes settings. Every change saves immediately — there is no Save
   button, and the content script picks changes up through storage events. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var TOGGLES = ['enabled', 'skipSameLanguage', 'translateEmbeds', 'keepSlang',
                 'casual', 'showBadge', 'outgoingEnabled', 'romanized'];
  var SELECTS = ['source', 'target', 'outgoingSource', 'outgoingTarget',
                 'engine', 'romanizedLang'];
  var SEGMENTS = ['outgoingMode', 'scope'];

  var here = { guildId: null, channelId: null };

  // ───────────────────────────────────────────────────── language lists
  function fillLanguages(select, selected, options) {
    var opts = options || {};
    var html = '';

    if (opts.auto) {
      html += '<option value="auto"' + (selected === 'auto' ? ' selected' : '') +
              '>Auto-detect</option>';
    }

    for (var i = 0; i < DT_LANGUAGES.length; i++) {
      var code = DT_LANGUAGES[i][0];
      var label = DT_LANGUAGES[i][1];
      if (opts.only && opts.only.indexOf(code) === -1) continue;
      // The two selects in a pair row are half width, so they carry the English
      // name alone — "Bengali — বাংলা" is clipped at that size.
      if (opts.short) label = label.split(' — ')[0];
      html += '<option value="' + code + '"' + (code === selected ? ' selected' : '') +
              '>' + label + '</option>';
    }
    select.innerHTML = html;
  }

  function shortName(code) {
    if (code === 'auto') return 'any language';
    var row = DT_LANGUAGES.filter(function (l) { return l[0] === code; })[0];
    return row ? row[1].split(' — ')[0] : code;
  }

  function save(patch) { chrome.storage.sync.set(patch); }

  function savePartial(key, value) {
    var patch = {};
    patch[key] = value;
    save(patch);
  }

  // ─────────────────────────────────────────────────────────── render
  function render(s) {
    TOGGLES.forEach(function (id) { $(id).checked = !!s[id]; });
    SELECTS.forEach(function (id) { $(id).value = s[id]; });
    $('libreUrl').value = s.libreUrl || '';

    SEGMENTS.forEach(function (id) {
      var value = id === 'scope' ? s.scope : s[id];
      [].forEach.call($(id).children, function (btn) {
        btn.classList.toggle('on', btn.dataset.value === value);
      });
    });

    $('body').classList.toggle('off', !s.enabled);
    $('outgoingOptions').classList.toggle('hidden', !s.outgoingEnabled);
    $('romanizedLangField').classList.toggle('hidden', !s.romanized);
    $('libreOptions').classList.toggle('hidden', s.engine !== 'libre');

    renderStatus(s);
    renderScope(s);
  }

  function renderStatus(s) {
    var status = $('status');
    if (!s.enabled) {
      status.textContent = 'Off';
      status.classList.remove('on');
      return;
    }
    var line = 'Reading in ' + shortName(s.target);
    if (s.outgoingEnabled) line += ' · sending in ' + shortName(s.outgoingTarget);
    status.textContent = line;
    status.classList.add('on');
  }

  function renderScope(s) {
    // Pinning needs to know where you are, so those options only work when the
    // popup was opened over an actual Discord channel.
    var buttons = $('scope').children;
    buttons[1].disabled = !here.guildId;
    buttons[2].disabled = !here.channelId;

    var anchored = s.anchor || {};
    var hint;

    if (s.scope === 'everywhere') {
      hint = 'Every server and every DM.';
    } else if (!here.channelId) {
      hint = 'Open a Discord channel to pin this.';
    } else if (s.scope === 'server') {
      hint = anchored.guildId === here.guildId
        ? (here.guildId === '@me' ? 'Pinned to your direct messages.' : 'Pinned to the server you have open.')
        : 'Pinned to another server — click again to move it here.';
    } else {
      hint = anchored.channelId === here.channelId
        ? 'Pinned to the channel you have open.'
        : 'Pinned to another channel — click again to move it here.';
    }
    $('scopeHint').textContent = hint;
  }

  // ─────────────────────────────────────────────────────────── wiring
  function attach(s) {
    TOGGLES.forEach(function (id) {
      $(id).addEventListener('change', function () {
        s[id] = $(id).checked;
        savePartial(id, s[id]);
        render(s);
      });
    });

    SELECTS.forEach(function (id) {
      $(id).addEventListener('change', function () {
        s[id] = $(id).value;
        savePartial(id, s[id]);
        render(s);
      });
    });

    $('libreUrl').addEventListener('change', function () {
      s.libreUrl = $('libreUrl').value.trim();
      savePartial('libreUrl', s.libreUrl);
    });

    $('outgoingMode').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      s.outgoingMode = btn.dataset.value;
      savePartial('outgoingMode', s.outgoingMode);
      render(s);
    });

    $('scope').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      s.scope = btn.dataset.value;
      // Pin to wherever the user is standing right now.
      s.anchor = { guildId: here.guildId, channelId: here.channelId };
      save({ scope: s.scope, anchor: s.anchor });
      render(s);
    });

    $('testBtn').addEventListener('click', function () {
      var out = $('testResult');
      var btn = $('testBtn');
      btn.disabled = true;
      out.className = 'test-result';
      out.textContent = 'Translating…';

      chrome.runtime.sendMessage(
        { type: 'dt:ping', text: 'ngl this is fire', target: s.target },
        function (res) {
          btn.disabled = false;
          if (chrome.runtime.lastError || !res || !res.ok) {
            out.className = 'test-result fail';
            out.textContent = (res && res.error) || 'No response';
            return;
          }
          out.className = 'test-result ok';
          out.textContent = '“ngl this is fire” → “' + res.text + '” via ' + res.provider;
        }
      );
    });
  }

  // ───────────────────────────────────────────────────────────── boot
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    here = dtParseLocation((tabs && tabs[0] && tabs[0].url) || '');

    dtLoadSettings().then(function (s) {
      fillLanguages($('source'), s.source, { auto: true, short: true });
      fillLanguages($('target'), s.target, { short: true });
      fillLanguages($('outgoingSource'), s.outgoingSource, { auto: true, short: true });
      fillLanguages($('outgoingTarget'), s.outgoingTarget, { short: true });
      fillLanguages($('romanizedLang'), s.romanizedLang, { only: DT_ROMANIZABLE });
      render(s);
      attach(s);
    });
  });
})();

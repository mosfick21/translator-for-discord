/* Reads and writes the six settings. Every change saves immediately — there is
   no Save button, and the content script picks changes up through storage. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var SELECTS = ['source', 'target', 'outgoingSource', 'outgoingTarget'];
  var SEGMENTS = ['mode', 'scope'];

  var here = { guildId: null, channelId: null };

  // ───────────────────────────────────────────────────── language lists
  function fillLanguages(select, selected, withAuto) {
    var html = withAuto
      ? '<option value="auto"' + (selected === 'auto' ? ' selected' : '') +
        '>Auto-detect</option>'
      : '';

    for (var i = 0; i < DT_LANGUAGES.length; i++) {
      var code = DT_LANGUAGES[i][0];
      // Half-width selects clip "Bengali — বাংলা", so the pair carries the
      // English name alone.
      var label = DT_LANGUAGES[i][1].split(' — ')[0];
      html += '<option value="' + code + '"' + (code === selected ? ' selected' : '') +
              '>' + label + '</option>';
    }
    select.innerHTML = html;
  }

  function nameOf(code) {
    if (code === 'auto') return 'any language';
    var row = DT_LANGUAGES.filter(function (l) { return l[0] === code; })[0];
    return row ? row[1].split(' — ')[0] : code;
  }

  function save(patch) { chrome.storage.sync.set(patch); }

  // ─────────────────────────────────────────────────────────── render
  function render(s) {
    $('enabled').checked = !!s.enabled;
    SELECTS.forEach(function (id) { $(id).value = s[id]; });

    SEGMENTS.forEach(function (id) {
      [].forEach.call($(id).children, function (btn) {
        btn.classList.toggle('on', btn.dataset.value === s[id]);
      });
    });

    $('body').classList.toggle('off', !s.enabled);

    var status = $('status');
    status.textContent = s.enabled
      ? nameOf(s.target) + ' · sending in ' + nameOf(s.outgoingTarget)
      : 'Off';
    status.classList.toggle('on', !!s.enabled);

    $('modeHint').textContent = s.mode === 'auto'
      ? 'Every message arrives in ' + nameOf(s.target) + '.'
      : 'Messages stay as posted. Point at one to get its translate button.';

    renderScope(s);
  }

  function renderScope(s) {
    // Pinning needs to know where you are, so those two only work when the
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
        ? (here.guildId === '@me' ? 'Pinned to your direct messages.'
                                  : 'Pinned to the server you have open.')
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
    $('enabled').addEventListener('change', function () {
      s.enabled = $('enabled').checked;
      save({ enabled: s.enabled });
      render(s);
    });

    SELECTS.forEach(function (id) {
      $(id).addEventListener('change', function () {
        s[id] = $(id).value;
        var patch = {};
        patch[id] = s[id];
        save(patch);
        render(s);
      });
    });

    $('mode').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      s.mode = btn.dataset.value;
      save({ mode: s.mode });
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
          out.textContent = '“ngl this is fire” → “' + res.text + '”';
        }
      );
    });
  }

  // ───────────────────────────────────────────────────────────── boot
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    here = dtParseLocation((tabs && tabs[0] && tabs[0].url) || '');

    dtLoadSettings().then(function (s) {
      fillLanguages($('source'), s.source, true);
      fillLanguages($('target'), s.target, false);
      fillLanguages($('outgoingSource'), s.outgoingSource, false);
      fillLanguages($('outgoingTarget'), s.outgoingTarget, false);
      render(s);
      attach(s);
    });
  });
})();

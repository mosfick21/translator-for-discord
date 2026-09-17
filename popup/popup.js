/* Reads and writes settings. Every change saves immediately — there is no
   Save button, and the content script picks changes up through storage events. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var CHECKBOXES = ['enabled', 'skipSameLanguage', 'translateEmbeds', 'keepSlang', 'casual',
                    'showBadge', 'outgoingEnabled', 'romanized'];
  var SELECTS = ['target', 'outgoingTarget', 'outgoingMode', 'engine', 'romanizedLang'];

  var here = { guildId: null, channelId: null };

  // -------------------------------------------------------------- language lists
  function fillLanguages(select, selected, only) {
    var html = '';
    for (var i = 0; i < DT_LANGUAGES.length; i++) {
      var code = DT_LANGUAGES[i][0];
      var name = DT_LANGUAGES[i][1];
      if (only && only.indexOf(code) === -1) continue;
      html += '<option value="' + code + '"' + (code === selected ? ' selected' : '') + '>' +
              name + '</option>';
    }
    select.innerHTML = html;
  }

  function save(patch) {
    chrome.storage.sync.set(patch);
  }

  // -------------------------------------------------------------------- render
  function render(settings) {
    CHECKBOXES.forEach(function (id) { $(id).checked = !!settings[id]; });
    SELECTS.forEach(function (id) { $(id).value = settings[id]; });
    $('libreUrl').value = settings.libreUrl || '';

    var scopeInput = document.querySelector('input[name="scope"][value="' + settings.scope + '"]');
    if (scopeInput) scopeInput.checked = true;

    $('body').classList.toggle('off', !settings.enabled);
    $('outgoingOptions').classList.toggle('hidden', !settings.outgoingEnabled);
    $('romanizedLangField').classList.toggle('hidden', !settings.romanized);
    $('libreOptions').classList.toggle('hidden', settings.engine !== 'libre');

    renderStatus(settings);
    renderScopeHints(settings);
  }

  function renderStatus(settings) {
    var status = $('status');
    if (!settings.enabled) {
      status.textContent = 'Off';
      status.classList.remove('on');
      return;
    }
    var language = DT_LANGUAGES.filter(function (l) { return l[0] === settings.target; })[0];
    var name = language ? language[1].split(' — ')[0] : settings.target;
    status.textContent = 'Reading in ' + name +
      (settings.outgoingEnabled ? ' · sending in ' + settings.outgoingTarget.toUpperCase() : '');
    status.classList.add('on');
  }

  function renderScopeHints(settings) {
    var serverRow = document.querySelector('.radio input[value="server"]').closest('.radio');
    var channelRow = document.querySelector('.radio input[value="channel"]').closest('.radio');

    // Scoping needs to know which channel you are in, so it is only offered
    // when the popup was opened over an actual Discord channel.
    var onChannel = !!here.channelId;

    serverRow.classList.toggle('disabled', !here.guildId);
    channelRow.classList.toggle('disabled', !onChannel);
    serverRow.querySelector('input').disabled = !here.guildId;
    channelRow.querySelector('input').disabled = !onChannel;

    var anchored = settings.anchor || {};
    $('serverHint').textContent = describe(
      here.guildId,
      anchored.guildId,
      settings.scope === 'server',
      here.guildId === '@me' ? 'Direct messages' : 'The server you have open'
    );
    $('channelHint').textContent = describe(
      here.channelId,
      anchored.channelId,
      settings.scope === 'channel',
      'The channel you have open'
    );
  }

  function describe(current, anchored, isActive, label) {
    if (!current) return 'Open a Discord channel first';
    if (isActive && anchored && anchored !== current) return 'Pinned elsewhere — click to move it here';
    return label;
  }

  // --------------------------------------------------------------------- wiring
  function attach(settings) {
    CHECKBOXES.forEach(function (id) {
      $(id).addEventListener('change', function () {
        settings[id] = $(id).checked;
        savePartial(id, $(id).checked);
        render(settings);
      });
    });

    SELECTS.forEach(function (id) {
      $(id).addEventListener('change', function () {
        settings[id] = $(id).value;
        savePartial(id, $(id).value);
        render(settings);
      });
    });

    $('libreUrl').addEventListener('change', function () {
      settings.libreUrl = $('libreUrl').value.trim();
      savePartial('libreUrl', settings.libreUrl);
    });

    document.querySelectorAll('input[name="scope"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        settings.scope = input.value;
        // Pin to wherever the user is right now.
        settings.anchor = { guildId: here.guildId, channelId: here.channelId };
        save({ scope: settings.scope, anchor: settings.anchor });
        render(settings);
      });
    });

    $('testBtn').addEventListener('click', function (e) {
      e.preventDefault();
      var line = $('testLine');
      line.className = 'hint';
      line.textContent = 'Testing…';

      chrome.runtime.sendMessage(
        { type: 'dt:ping', text: 'ngl this is fire', target: settings.target },
        function (res) {
          if (chrome.runtime.lastError || !res || !res.ok) {
            line.className = 'hint fail';
            line.textContent = 'Failed: ' + ((res && res.error) || 'no response');
            return;
          }
          line.className = 'hint ok';
          line.textContent = '“ngl this is fire” → “' + res.text +
                             '” (via ' + res.provider + ')';
        }
      );
    });
  }

  function savePartial(key, value) {
    var patch = {};
    patch[key] = value;
    save(patch);
  }

  // ----------------------------------------------------------------------- boot
  function boot() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var url = (tabs && tabs[0] && tabs[0].url) || '';
      here = dtParseLocation(url);

      dtLoadSettings().then(function (settings) {
        fillLanguages($('target'), settings.target);
        fillLanguages($('outgoingTarget'), settings.outgoingTarget);
        // Only languages the transliteration service can handle.
        fillLanguages($('romanizedLang'), settings.romanizedLang, DT_ROMANIZABLE);
        render(settings);
        attach(settings);
      });
    });
  }

  boot();
})();

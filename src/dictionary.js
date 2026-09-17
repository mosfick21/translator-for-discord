/* Reads src/dictionary.bin — a Bloom filter over ordinary English words, built
   by tools/build-dictionary.js.

   It answers one question: is this a real word, or something the internet made
   up? Coined vocabulary is absent from a dictionary, and a word no dictionary
   knows is one no translator will render well, so it is left as typed. That is
   what lets new words work without anyone adding them to a list — "skibidi"
   and "delulu" are handled by the same rule that handles "fomo".

   A real word is never missed. About two per cent of invented words look real
   and get translated anyway; the curated list in slang.js covers the ones that
   come up often enough to matter. */

var DT_DICT = null;

/** Load the filter once. Safe to call repeatedly; the promise is reused. */
var dtDictionaryReady = (function () {
  var loading = null;
  return function () {
    if (DT_DICT) return Promise.resolve(DT_DICT);
    if (loading) return loading;

    loading = fetch(chrome.runtime.getURL('src/dictionary.bin'))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(function (buffer) {
        var head = new DataView(buffer, 0, 12);
        var magic = String.fromCharCode(head.getUint8(0), head.getUint8(1),
                                        head.getUint8(2), head.getUint8(3));
        if (magic !== 'DTD1') throw new Error('Not a dictionary file');

        DT_DICT = {
          bits: head.getUint32(4, true),
          hashes: head.getUint32(8, true),
          data: new Uint8Array(buffer, 12)
        };
        return DT_DICT;
      })
      .catch(function () {
        // Without the file every word looks invented, which would leave whole
        // messages untranslated. Better to behave as though everything is a
        // real word and fall back to the curated list alone.
        DT_DICT = { bits: 0, hashes: 0, data: new Uint8Array(0) };
        return DT_DICT;
      });

    return loading;
  };
})();

/* Must match tools/build-dictionary.js exactly. */
function dtWordHashes(word) {
  var h1 = 2166136261;        // FNV-1a
  var h2 = 5381;              // djb2
  for (var i = 0; i < word.length; i++) {
    var c = word.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = (Math.imul(h2, 33) ^ c) | 0;
  }
  return [h1 >>> 0, (h2 >>> 0) | 1];
}

/**
 * Is this an ordinary English word? Answers true when the filter is unavailable
 * or the token is not a plain Latin word, so callers treat it as translatable.
 */
function dtIsRealWord(word) {
  if (!DT_DICT || !DT_DICT.bits) return true;

  var w = String(word || '').toLowerCase();
  if (!/^[a-z]{2,16}$/.test(w)) return true;

  var pair = dtWordHashes(w);
  for (var i = 0; i < DT_DICT.hashes; i++) {
    var bit = ((pair[0] + Math.imul(i, pair[1])) >>> 0) % DT_DICT.bits;
    if (!(DT_DICT.data[bit >>> 3] & (1 << (bit & 7)))) return false;
  }
  return true;
}

/* The words an English sentence is built out of. Other languages have their own
   function words, so a text full of these is English and almost nothing else. */
var DT_COMMON_EN = new Set([
  'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'back', 'be', 'because', 'been', 'before', 'being',
  'but', 'by', 'can', 'come', 'could', 'did', 'do', 'does', 'doing', 'done',
  'down', 'each', 'even', 'every', 'for', 'from', 'get', 'go', 'going', 'got',
  'had', 'has', 'have', 'he', 'her', 'here', 'him', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'just', 'know', 'like', 'look', 'make',
  'many', 'me', 'more', 'most', 'much', 'my', 'need', 'new', 'no', 'not',
  'now', 'of', 'off', 'on', 'one', 'only', 'or', 'other', 'our', 'out',
  'over', 'own', 'please', 'really', 'right', 'said', 'same', 'say', 'see',
  'she', 'should', 'so', 'some', 'still', 'such', 'take', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'thing', 'think',
  'this', 'those', 'through', 'time', 'to', 'too', 'under', 'up', 'us',
  'use', 'very', 'want', 'was', 'way', 'we', 'well', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would', 'you',
  'your', 'yours'
]);

/** How much of the text is built from ordinary English function words. */
function dtCommonRatio(text) {
  var words = String(text || '').toLowerCase().match(/[a-z']+/g);
  if (!words || !words.length) return 0;
  var known = 0;
  for (var i = 0; i < words.length; i++) {
    if (DT_COMMON_EN.has(words[i])) known++;
  }
  return known / words.length;
}

/**
 * Is this text English? Two signals, because either one alone gets it wrong.
 *
 * The dictionary misses short slangy sentences — "this is so skibidi ngl" is
 * two invented words out of three. Function words miss dense ones — "fomo is
 * real rn, everyone aping in" carries almost none. A sentence only has to look
 * English by one measure to count.
 *
 * Text too short to judge counts as English, which merely leaves the slang rule
 * switched on; the curated lists still decide the outcome.
 */
function dtMostlyEnglish(text) {
  var words = String(text || '').match(/[a-zA-Z]{3,16}/g);
  if (!words || words.length < 3) return true;

  var known = 0;
  for (var i = 0; i < words.length; i++) {
    if (dtIsRealWord(words[i])) known++;
  }
  var recognised = known / words.length;
  var common = dtCommonRatio(text);

  // Plenty of function words settles it on its own.
  if (common >= 0.4) return true;

  // Otherwise the dictionary needs backing up. An English dictionary is full of
  // short words that are also ordinary words elsewhere — "MET tidur bang" is
  // two-thirds recognised and not a word of English. Real English of any length
  // carries at least one "is", "the" or "you".
  return recognised >= 0.5 && common > 0;
}

/** Ordinary English prose, as opposed to romanised text that happens to be Latin. */
function dtLooksEnglish(text) {
  var words = (String(text || '').toLowerCase().match(/[a-z']+/g) || [])
    .filter(function (w) { return w.length > 1; });
  if (words.length < 3) return false;
  var known = words.filter(function (w) { return DT_COMMON_EN.has(w); }).length;
  return known / words.length >= 0.5;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { dtIsRealWord: dtIsRealWord, dtMostlyEnglish: dtMostlyEnglish };
}

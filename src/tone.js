/* Translation engines answer in the polite, written register — "আপনি কখন মিন্ট
   করবেন?" — which is not how anyone talks in a Discord channel. This relaxes
   the output into the form people actually type.

   Only changes that cannot be wrong belong here. "যান" is left alone because it
   is both "go" and "vehicle"; "দিন" is both "give" and "day". A stiff sentence
   is a smaller problem than a wrong one.

   Every other part of this extension treats all languages alike; this table is
   the one place that cannot, because politeness is built differently in each
   one. Rules are listed only where a mechanical change is reliably correct:
   Bengali, Hindi, Turkish, Indonesian and Malay mark politeness in a pronoun or
   a regular suffix, so it can be relaxed by rule. Spanish, French and German
   conjugate the verb to match the pronoun — swapping "usted" for "tú" without
   rewriting the verb produces something no speaker would write — so they are
   deliberately absent, and their translations pass through untouched.

   To add a language, add its code with a list of [pattern, replacement] pairs.
   The bar is that the change must never be wrong, not that it catches
   everything. */

var DT_TONE = {
  bn: [
    // Polite second person becomes familiar. Longest first, so আপনাদের is not
    // matched as আপনা + দের.
    [/আপনাদের/g, 'তোমাদের'],
    [/আপনাকে/g, 'তোমাকে'],
    [/আপনারা/g, 'তোমরা'],
    [/আপনার/g, 'তোমার'],
    [/আপনি/g, 'তুমি'],

    // Verb endings. The lookahead keeps the match at the end of a word —
    // \b does not work here because Bengali letters are not word characters.
    [/বেন(?![ঀ-৿])/g, 'বে'],       // করবেন -> করবে
    [/ছেন(?![ঀ-৿])/g, 'ছো'],       // করছেন -> করছো
    [/েছেন(?![ঀ-৿])/g, 'েছো'],     // করেছেন -> করেছো

    // Imperatives that have no second meaning.
    [/করুন(?![ঀ-৿])/g, 'করো'],
    [/দেখুন(?![ঀ-৿])/g, 'দেখো'],
    [/বলুন(?![ঀ-৿])/g, 'বলো'],
    [/শুনুন(?![ঀ-৿])/g, 'শোনো'],
    [/আসুন(?![ঀ-৿])/g, 'এসো'],
    [/থাকুন(?![ঀ-৿])/g, 'থাকো'],
    [/লিখুন(?![ঀ-৿])/g, 'লেখো'],
    [/পাঠান(?![ঀ-৿])/g, 'পাঠাও'],

    // Formal wording nobody types.
    [/অনুগ্রহ করে/g, 'প্লিজ'],
    [/এই মুহূর্তে/g, 'এখন'],
    [/অত্যন্ত/g, 'খুব'],
    [/সম্পন্ন হয়েছে/g, 'হয়ে গেছে']
  ],

  hi: [
    [/आपको/g, 'तुम्हें'],
    [/आपका/g, 'तुम्हारा'],
    [/आपकी/g, 'तुम्हारी'],
    [/आपके/g, 'तुम्हारे'],
    [/आप/g, 'तुम'],
    [/कीजिए/g, 'करो'],
    [/कीजिये/g, 'करो'],
    [/देखिए/g, 'देखो'],
    [/बताइए/g, 'बताओ'],
    [/कृपया/g, 'प्लीज़']
  ],

  // Indonesian and Malay carry politeness in the pronoun alone — the verb never
  // changes — so swapping it is always safe.
  id: [
    [/\bAnda\b/g, 'kamu'],
    [/\banda\b/g, 'kamu'],
    [/\bBapak\/Ibu\b/g, 'kamu'],
    [/\bSilakan\b/g, 'Coba'],
    [/\bsilakan\b/g, 'coba']
  ],
  ms: [
    [/\bAnda\b/g, 'awak'],
    [/\banda\b/g, 'awak'],
    [/\bSila\b/g, 'Cuba'],
    [/\bsila\b/g, 'cuba']
  ],

  // Turkish marks politeness with a regular suffix, so the ending can be
  // shortened without touching the stem.
  tr: [
    [/sınız(?=\b)/g, 'sın'],
    [/siniz(?=\b)/g, 'sin'],
    [/sunuz(?=\b)/g, 'sun'],
    [/sünüz(?=\b)/g, 'sün'],
    [/\bLütfen\b/g, 'Hadi'],
    [/\blütfen\b/g, 'hadi']
  ]
};

/**
 * Relax a translation into everyday speech. Languages with no rules here are
 * returned untouched, which is the right answer for most of them — English and
 * Spanish carry no politeness in the verb the way Bengali and Hindi do.
 */
function dtCasualise(text, lang) {
  var rules = DT_TONE[lang];
  if (!rules || !text) return text;
  for (var i = 0; i < rules.length; i++) {
    text = text.replace(rules[i][0], rules[i][1]);
  }
  return text;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { dtCasualise: dtCasualise, DT_TONE: DT_TONE };
}

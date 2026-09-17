/* Builds src/dictionary.bin — a Bloom filter over ordinary English words.
 *
 * The extension uses it to answer one question: is this Latin word a real word,
 * or something the internet made up? Coined vocabulary — fomo, wagmi, bussin,
 * goated, rugpull — is absent from an English dictionary, so a word that misses
 * here is one no translator will handle well, and is better left as typed.
 *
 * A Bloom filter is used because the answer only has to be safe in one
 * direction. A real word is never missed, so a genuine word is never wrongly
 * held back; the cost is that a small share of invented words look real and get
 * translated anyway. At the size below that is about 2%, and the curated list in
 * src/slang.js covers the ones that matter.
 *
 * Source: dwyl/english-words (Unlicense), ~370k words.
 *
 *   node tools/build-dictionary.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
const OUT = path.join(__dirname, '..', 'src', 'dictionary.bin');

const BITS_PER_WORD = 8;   // ~2% false positives at k = 5
const HASHES = 5;

/* Two independent 32-bit hashes; the rest are derived from them, which is as
   good as computing five and considerably cheaper. */
function hashes(word) {
  let h1 = 2166136261;                       // FNV-1a
  let h2 = 5381;                             // djb2
  for (let i = 0; i < word.length; i++) {
    const c = word.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = (Math.imul(h2, 33) ^ c) | 0;
  }
  return [h1 >>> 0, (h2 >>> 0) | 1];         // odd second hash keeps the stride coprime
}

function indices(word, bits) {
  const [h1, h2] = hashes(word);
  const out = new Array(HASHES);
  // Math.imul returns a signed result, so force the sum unsigned before the
  // modulo — a negative index silently reads past the array and the filter
  // then answers "absent" for everything.
  for (let i = 0; i < HASHES; i++) out[i] = ((h1 + Math.imul(i, h2)) >>> 0) % bits;
  return out;
}

(async () => {
  process.stdout.write('fetching word list… ');
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  console.log(`${(raw.length / 1e6).toFixed(1)} MB`);

  // Single-letter words carry no meaning here, and anything very long is never
  // going to be mistaken for slang.
  const words = raw
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2 && w.length <= 16 && /^[a-z]+$/.test(w));

  const unique = [...new Set(words)];
  const bits = unique.length * BITS_PER_WORD;
  const bytes = Math.ceil(bits / 8);
  const filter = new Uint8Array(bytes);

  for (const word of unique) {
    for (const bit of indices(word, bits)) filter[bit >>> 3] |= 1 << (bit & 7);
  }

  // A 12-byte header keeps the reader honest about what it is loading.
  const header = Buffer.alloc(12);
  header.write('DTD1', 0, 'ascii');
  header.writeUInt32LE(bits, 4);
  header.writeUInt32LE(HASHES, 8);

  fs.writeFileSync(OUT, Buffer.concat([header, Buffer.from(filter)]));

  // Measure what was actually built rather than trusting the arithmetic.
  const has = (w) => indices(w, bits).every((b) => filter[b >>> 3] & (1 << (b & 7)));
  const invented = ['fomo', 'wagmi', 'bussin', 'goated', 'rugpull', 'hodl', 'ngmi',
                    'degen', 'copium', 'ratioed', 'mogging', 'skibidi', 'rizzler',
                    'gyatt', 'delulu', 'npcish', 'yeeted'];
  const falsePositives = invented.filter(has);

  console.log(`words        ${unique.length.toLocaleString()}`);
  console.log(`file         ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
  console.log(`real words   ${['immaculate', 'reconcile', 'quiver', 'ledger'].every(has) ? 'all found' : 'MISSING — filter is broken'}`);
  console.log(`invented     ${invented.length - falsePositives.length}/${invented.length} correctly absent` +
              (falsePositives.length ? `  (read as real: ${falsePositives.join(', ')})` : ''));
})();

/* Google translates word by word, so casual chat comes out wrong: "ngl fomo is
   real" turns into gibberish in most languages. Expanding the shorthand into
   plain English first is the cheapest way to get a sentence that means what the
   person actually said.

   Only unambiguous entries belong here. "gg" is left out because it is also a
   real word in several languages; "af" is left out because it collides with too
   much. When in doubt, leave it — a literal translation beats a wrong guess. */

var DT_SLANG = {
  // feelings / reactions
  'fomo': 'the fear of missing out',
  'yolo': 'you only live once',
  'ngl': 'not going to lie',
  'tbh': 'to be honest',
  'imo': 'in my opinion',
  'imho': 'in my honest opinion',
  'iykyk': 'if you know, you know',
  'istg': 'I swear to God',
  'fr': 'for real',
  'ong': 'honestly, I mean it',
  'lowkey': 'kind of',
  'highkey': 'very much',
  'deadass': 'seriously',
  'no cap': 'no lie',
  'cap': 'a lie',
  'mid': 'mediocre',
  'based': 'admirable for being honest',
  'cringe': 'embarrassing',
  'sus': 'suspicious',
  'goated': 'the greatest',
  'bussin': 'really good',
  'slaps': 'is really good',
  'cooked': 'in serious trouble',
  'washed': 'past their prime',
  'ratio': 'more replies than likes',
  'salty': 'bitter',
  'copium': 'wishful thinking',
  'hopium': 'wishful hope',
  'malding': 'angry and frustrated',
  'tilted': 'frustrated',
  'huffing copium': 'refusing to accept reality',

  // laughing
  'lmao': 'that is very funny',
  'lmfao': 'that is extremely funny',
  'rofl': 'that is hilarious',
  'lol': 'haha',
  'lel': 'haha',
  'kek': 'haha',
  'ded': 'that is hilarious',
  'im dead': 'that is hilarious',

  // conversation
  'idk': 'I do not know',
  'idc': 'I do not care',
  'idgaf': 'I really do not care',
  'iirc': 'if I remember correctly',
  'afaik': 'as far as I know',
  'nvm': 'never mind',
  'tldr': 'in short',
  'tl;dr': 'in short',
  'btw': 'by the way',
  'fyi': 'for your information',
  'ftw': 'for the win',
  'smh': 'I am disappointed',
  'ikr': 'I know, right',
  'ily': 'I love you',
  'wdym': 'what do you mean',
  'wyd': 'what are you doing',
  'hbu': 'how about you',
  'wbu': 'what about you',
  'rn': 'right now',
  'atm': 'at the moment',
  'asap': 'as soon as possible',
  'tysm': 'thank you so much',
  'ty': 'thank you',
  'np': 'no problem',
  'yw': 'you are welcome',
  'pls': 'please',
  'plz': 'please',
  'thx': 'thanks',
  'ur': 'your',
  'u': 'you',
  'r': 'are',
  'k': 'okay',
  'kk': 'okay',
  'ofc': 'of course',
  'obv': 'obviously',
  'prob': 'probably',
  'rly': 'really',
  'srsly': 'seriously',
  'w/e': 'whatever',
  'w/': 'with',
  'w/o': 'without',
  'bc': 'because',
  'cuz': 'because',
  'bcz': 'because',
  'tho': 'though',
  'ily2': 'I love you too',

  // status
  'afk': 'away from keyboard',
  'brb': 'be right back',
  'gtg': 'I have to go',
  'g2g': 'I have to go',
  'omw': 'on my way',
  'ttyl': 'talk to you later',
  'wfh': 'working from home',
  'irl': 'in real life',
  'dm': 'direct message',
  'pm': 'private message',

  // crypto / NFT chat, which is most of what a mining server talks about
  'wagmi': 'we are all going to make it',
  'ngmi': 'we are not going to make it',
  'gm': 'good morning',
  'gn': 'good night',
  'hodl': 'hold on and do not sell',
  'dyor': 'do your own research',
  'nfa': 'this is not financial advice',
  'rugpull': 'a scam where the founders take the money and disappear',
  'rugged': 'scammed by the founders taking the money',
  'ath': 'all-time high',
  'atl': 'all-time low',
  'fud': 'fear and doubt spread on purpose',
  'ape in': 'buy without thinking it through',
  'aping in': 'buying without thinking it through',
  'moon': 'go up sharply in price',
  'mooning': 'going up sharply in price',
  'rekt': 'having lost a lot of money',
  'bags': 'holdings that lost value',
  'bagholder': 'someone stuck holding a losing investment',
  'whale': 'someone holding a very large amount',
  'shill': 'promote something for personal gain',
  'shilling': 'promoting something for personal gain',
  'degen': 'a reckless trader',
  'floor': 'the lowest listed price',
  'mint': 'create a new token',
  'minting': 'creating new tokens',
  'gas': 'the network transaction fee',
  'wen': 'when',
  'ser': 'sir',
  'fren': 'friend',
  'frens': 'friends',
  'pump': 'a sharp rise in price',
  'dump': 'a sharp fall in price',
  'paper hands': 'someone who sells at the first sign of trouble',
  'diamond hands': 'someone who holds no matter what',

  // gaming
  'gl': 'good luck',
  'hf': 'have fun',
  'glhf': 'good luck and have fun',
  'op': 'overpowered',
  'nerf': 'weaken',
  'buff': 'strengthen',
  'meta': 'the current best strategy',
  'noob': 'a beginner',
  'smurf': 'an experienced player on a new account',
  'carry': 'win the game for the team',
  'throw': 'lose a game that was already won',
  'clutch': 'win under pressure',
  'ez': 'easy',
  'lfg': 'looking for a group',
  'afk farm': 'gain rewards without playing actively'
};

/* Some words should not be translated at all. "fomo" has no Bengali equivalent
   worth having — every language just says fomo — and a translator that insists
   on rendering it produces "the fear of missing out" in the middle of a chat
   message, which is worse than leaving it alone. Same for "chill", "vibe" and
   most of the vocabulary a server like this one runs on.

   These are held back before translation and put back afterwards, so they come
   through exactly as typed. Anything listed here is also skipped by the slang
   expansion above — keeping the word beats spelling out what it means. */
var DT_KEEP_WORDS = new Set([
  // internet culture
  'fomo', 'yolo', 'chill', 'chilling', 'vibe', 'vibes', 'cringe', 'based',
  'sus', 'hype', 'hyped', 'meme', 'memes', 'troll', 'trolling', 'flex',
  'clout', 'drip', 'goat', 'goated', 'ratio', 'simp', 'stan', 'savage',
  'salty', 'toxic', 'banger', 'slay', 'bussin', 'spam', 'copium', 'hopium',

  // gaming
  'noob', 'lag', 'ping', 'afk', 'nerf', 'buff', 'smurf', 'clutch', 'meta',
  'grind', 'grinding', 'respawn', 'loot',

  // crypto and NFT, which is most of what gets said here
  'wagmi', 'ngmi', 'hodl', 'dyor', 'nfa', 'rekt', 'degen', 'whale', 'shill',
  'shilling', 'airdrop', 'mint', 'minting', 'gas', 'moon', 'mooning', 'pump',
  'dump', 'rug', 'rugpull', 'rugged', 'fud', 'ath', 'atl', 'dao', 'defi',
  'nft', 'ico', 'ido', 'tge', 'kyc', 'whitelist', 'allowlist', 'floor',
  'staking', 'stake', 'yield', 'apy', 'apr', 'alpha', 'gwei', 'mempool',
  'testnet', 'mainnet', 'faucet', 'bridge', 'swap', 'liquidity', 'validator',
  'node', 'miner', 'mining', 'hashrate'
]);

var DT_KEEP_RE = new RegExp(
  '(?<![\\p{L}\\p{N}_])(' +
    Array.from(DT_KEEP_WORDS).sort(function (a, b) { return b.length - a.length; }).join('|') +
  ')(?![\\p{L}\\p{N}_])',
  'giu'
);

/**
 * Replace the words that should survive translation with numbered markers.
 * Returns the masked text and the words to put back. Braces are used rather
 * than brackets so these never collide with the [1] markers the content script
 * uses to hold a message together.
 */
function dtProtect(text) {
  var kept = [];

  var masked = String(text || '').replace(DT_KEEP_RE, function (match) {
    kept.push(match);
    return '{' + kept.length + '}';
  });

  /* The list above only covers words that are also ordinary English — chill,
     vibe, floor, gas. Everything the internet invents is caught by the
     dictionary instead: a Latin word no dictionary knows is one no translator
     will render well. That is what makes this work for words nobody has added
     yet. */
  masked = masked.replace(/(?<![\p{L}\p{N}_{])[a-zA-Z]{3,16}(?![\p{L}\p{N}_}])/gu, function (word) {
    if (dtIsRealWord(word)) return word;
    kept.push(word);
    return '{' + kept.length + '}';
  });

  return { text: masked, kept: kept };
}

/** Put the held-back words back, exactly as they were typed. */
function dtRestore(text, kept) {
  if (!kept || !kept.length) return text;
  return String(text || '').replace(/\{(\d+)\}/g, function (whole, n) {
    var word = kept[Number(n) - 1];
    return word === undefined ? whole : word;
  });
}

/* Sorted longest-first so "no cap" is matched before "cap". */
var DT_SLANG_KEYS = Object.keys(DT_SLANG).sort(function (a, b) {
  return b.length - a.length;
});

function dtEscapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* One pass over the text, replacing whole-word matches only.
   \b does not work on entries that end in punctuation ("tl;dr", "w/"), so the
   boundaries are spelled out with lookarounds instead. */
var DT_SLANG_RE = new RegExp(
  '(?<![\\p{L}\\p{N}_])(' +
    DT_SLANG_KEYS.map(dtEscapeRegExp).join('|') +
  ')(?![\\p{L}\\p{N}_])',
  'giu'
);

/**
 * Rewrite internet shorthand as plain English so a literal translator has a
 * real sentence to work with. Anything inside a URL, a code span, a mention or
 * a custom emoji is left exactly as it was.
 */
function dtExpandSlang(text) {
  if (!text) return text;

  var guarded = [];
  // Park the parts that must not be touched, then put them back at the end.
  var masked = text.replace(
    /(https?:\/\/\S+|`[^`]*`|<[@#!&:][^>]*>|:[a-z0-9_+-]+:)/gi,
    function (match) {
      guarded.push(match);
      return ' ' + (guarded.length - 1) + ' ';
    }
  );

  masked = masked.replace(DT_SLANG_RE, function (match) {
    var replacement = DT_SLANG[match.toLowerCase()];
    if (!replacement) return match;
    // Keep a capitalised match capitalised so sentence starts still read right.
    if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  });

  return masked.replace(/ (\d+) /g, function (_, i) {
    return guarded[Number(i)];
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { dtExpandSlang: dtExpandSlang, DT_SLANG: DT_SLANG };
}

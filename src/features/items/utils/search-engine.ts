import type { RawItem, ItemWithImage } from "../types";

/**
 * Common stopwords to deprioritize in search query matching
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "of", "for", "with", "by", "from",
  "and", "or", "to", "is", "was", "near", "around", "inside", "outside", "found", "lost"
]);

/**
 * Campus-specific synonyms & aliases to catch small details
 */
const SYNONYMS: Record<string, string[]> = {
  // Electronics
  calc: ["calculator", "casio", "scientific", "fx991", "fx82"],
  calculator: ["calc", "casio", "scientific", "fx991", "fx82"],
  casio: ["calculator", "calc", "watch"],
  earbuds: ["earphones", "airpods", "headphones", "buds", "tws", "audio", "headset", "boat", "noise"],
  airpods: ["earbuds", "earphones", "apple", "buds", "tws"],
  earphones: ["earbuds", "headphones", "airpods", "buds", "wired", "earphone"],
  headphones: ["earbuds", "earphones", "headset", "boat", "sony", "jbl"],
  laptop: ["macbook", "dell", "hp", "lenovo", "asus", "acer", "notebook", "charger"],
  macbook: ["laptop", "apple", "mac", "air", "pro"],
  charger: ["adapter", "cable", "cord", "wire", "type-c", "lightning", "powerbank"],
  adapter: ["charger", "cable", "plug"],
  phone: ["mobile", "iphone", "smartphone", "samsung", "oneplus", "redmi", "realme"],
  mobile: ["phone", "smartphone", "iphone", "samsung"],
  iphone: ["phone", "mobile", "apple"],

  // Documents & Personal
  id: ["identity", "card", "hallticket", "lanyard", "badge", "rfid", "smartcard"],
  card: ["id", "identity", "debit", "credit", "metro", "smartcard"],
  identity: ["id", "card", "student"],
  lanyard: ["id", "card", "tag", "ribbon", "strap"],
  wallet: ["purse", "pouch", "money", "cash", "billfold", "leather"],
  purse: ["wallet", "bag", "pouch", "handbag"],
  pouch: ["wallet", "pencil", "case", "kit"],
  bag: ["backpack", "sack", "tote", "duffel", "wildcraft"],
  backpack: ["bag", "sack", "rucksack"],

  // Accessories & Wearables
  keys: ["key", "keychain", "bike", "cycle", "room", "lock"],
  key: ["keys", "keychain", "ring", "bike"],
  keychain: ["keys", "key", "ring"],
  watch: ["smartwatch", "fastrack", "titan", "casio", "boat", "noise", "analog", "digital"],
  smartwatch: ["watch", "fitness", "band"],
  specs: ["glasses", "spectacles", "sunglasses", "goggles", "frames", "eyewear"],
  glasses: ["specs", "spectacles", "sunglasses", "frames"],
  spectacles: ["specs", "glasses", "sunglasses"],
  bottle: ["flask", "thermos", "water", "sipper", "milton", "steel"],
  flask: ["bottle", "thermos", "milton"],
  umbrella: ["raincoat", "parasol"],

  // Campus Locations & Landmarks
  canteen: ["cafeteria", "mess", "food", "cafe", "snack"],
  library: ["lib", "reading", "books", "stack"],
  quad: ["quadrangle", "ground", "courtyard"],
  quadrangle: ["quad", "ground"],
  building: ["block", "wing", "floor", "classroom"],
  lab: ["computer", "workshop", "electronics", "physics", "chemistry"],

  // Books, Academics & Stationery
  book: ["books", "textbook", "novel", "notes", "notebook", "guide", "paper"],
  books: ["book", "textbook", "notes", "novel", "stationery"],
};

/**
 * Normalizes text for comparison: lowercases, strips punctuation, normalizes spacing
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reduces simple English plurals to their base form
 */
export function stemToken(token: string): string {
  if (token.endsWith("ies") && token.length > 4) {
    return token.slice(0, -3) + "y";
  }
  if (token.endsWith("es") && token.length > 3) {
    // e.g. glasses -> glass, boxes -> box
    if (token.endsWith("sses") || token.endsWith("xes") || token.endsWith("ches") || token.endsWith("shes")) {
      return token.slice(0, -2);
    }
  }
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 2) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Splits query string into meaningful, normalized search tokens
 */
export function tokenizeQuery(query: string): string[] {
  const clean = normalizeText(query);
  if (!clean) return [];

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const result: string[] = [];

  for (const token of rawTokens) {
    if (token.length < 2 && !/\d/.test(token)) continue;
    result.push(token);

    const stemmed = stemToken(token);
    if (stemmed !== token && stemmed.length >= 2) {
      result.push(stemmed);
    }
  }

  return Array.from(new Set(result));
}

/**
 * Computes Levenshtein distance between two short strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a token matches target text with typo tolerance
 */
function tokenFuzzyMatch(token: string, targetWords: string[]): boolean {
  if (token.length < 4) return false;
  const maxDistance = token.length <= 5 ? 1 : 2;

  for (const word of targetWords) {
    if (Math.abs(word.length - token.length) > maxDistance) continue;
    if (levenshteinDistance(token, word) <= maxDistance) {
      return true;
    }
  }
  return false;
}

export interface MatchScoreResult {
  score: number;
  matchedTokensCount: number;
  matchedDetails: string[];
}

/**
 * Scores an item against a user search query.
 * Inspects all small details across title, description, location, and category.
 */
export function scoreItemMatch(
  item: {
    title: string;
    description?: string | null;
    location?: string | null;
    category?: string | null;
    poster_name?: string | null;
  },
  query: string
): MatchScoreResult {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) {
    return { score: 1, matchedTokensCount: 0, matchedDetails: [] };
  }

  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) {
    return { score: 1, matchedTokensCount: 0, matchedDetails: [] };
  }

  const titleNorm = normalizeText(item.title);
  const descNorm = normalizeText(item.description || "");
  const locNorm = normalizeText(item.location || "");
  const catNorm = normalizeText(item.category || "");
  const posterNorm = normalizeText(item.poster_name || "");

  const titleWords = titleNorm.split(/\s+/).filter(Boolean);
  const descWords = descNorm.split(/\s+/).filter(Boolean);
  const locWords = locNorm.split(/\s+/).filter(Boolean);
  const catWords = catNorm.split(/\s+/).filter(Boolean);
  const posterWords = posterNorm.split(/\s+/).filter(Boolean);
  const allWords = [...titleWords, ...descWords, ...locWords, ...catWords, ...posterWords];

  let score = 0;
  const matchedTokens = new Set<string>();
  const matchedDetails: string[] = [];

  // 1. Exact full-phrase match in title (Highest relevance)
  if (titleNorm.includes(cleanQuery)) {
    score += 160;
    matchedDetails.push("Exact title phrase");
  } else if (descNorm.includes(cleanQuery)) {
    score += 100;
    matchedDetails.push("Exact description phrase");
  } else if (locNorm.includes(cleanQuery)) {
    score += 90;
    matchedDetails.push("Exact location phrase");
  } else if (posterNorm && posterNorm.includes(cleanQuery)) {
    score += 85;
    matchedDetails.push("Exact poster phrase");
  } else if (catNorm.includes(cleanQuery)) {
    score += 70;
    matchedDetails.push("Exact category phrase");
  }

  // Filter out pure stopwords if we have other tokens
  const nonStopTokens = queryTokens.filter((t) => !STOP_WORDS.has(t));
  const effectiveTokens = nonStopTokens.length > 0 ? nonStopTokens : queryTokens;

  for (const token of effectiveTokens) {
    let tokenMatched = false;

    // Direct title match
    if (titleNorm.includes(token)) {
      score += 45;
      tokenMatched = true;
      matchedDetails.push(`Title: "${token}"`);
    } else if (titleWords.some((w) => stemToken(w) === stemToken(token))) {
      score += 40;
      tokenMatched = true;
      matchedDetails.push(`Title root: "${token}"`);
    }

    // Location match (critical campus detail!)
    if (locNorm.includes(token)) {
      score += 38;
      tokenMatched = true;
      matchedDetails.push(`Location: "${token}"`);
    }

    // Category match
    if (catNorm.includes(token)) {
      score += 30;
      tokenMatched = true;
      matchedDetails.push(`Category: "${token}"`);
    } else if (catWords.some((w) => stemToken(w) === stemToken(token))) {
      score += 26;
      tokenMatched = true;
      matchedDetails.push(`Category root: "${token}"`);
    }

    // Poster name match
    if (posterNorm && posterNorm.includes(token)) {
      score += 30;
      tokenMatched = true;
      matchedDetails.push(`Poster: "${token}"`);
    } else if (posterWords.some((w) => stemToken(w) === stemToken(token))) {
      score += 24;
      tokenMatched = true;
      matchedDetails.push(`Poster root: "${token}"`);
    }

    // Description match (details like brand, color, contents)
    if (descNorm.includes(token)) {
      score += 26;
      tokenMatched = true;
      matchedDetails.push(`Description: "${token}"`);
    } else if (descWords.some((w) => stemToken(w) === stemToken(token))) {
      score += 22;
      tokenMatched = true;
    }

    // Synonym / Alias expansion (e.g. casio -> calculator, airpods -> earbuds, specs -> glasses)
    if (!tokenMatched) {
      const synonyms = SYNONYMS[token] || [];
      for (const syn of synonyms) {
        if (titleNorm.includes(syn) || descNorm.includes(syn) || locNorm.includes(syn) || catNorm.includes(syn)) {
          score += 24;
          tokenMatched = true;
          matchedDetails.push(`Synonym: "${token}" ≈ "${syn}"`);
          break;
        }
      }
    }

    // Typo / Fuzzy tolerance match (catches small spelling errors like "airpord", "canten")
    if (!tokenMatched && tokenFuzzyMatch(token, allWords)) {
      score += 18;
      tokenMatched = true;
      matchedDetails.push(`Fuzzy match for "${token}"`);
    }

    if (tokenMatched) {
      matchedTokens.add(token);
    }
  }

  // Cross-Field Multi-Token Bonus:
  // If ALL query terms are matched across the item's details, award massive completeness boost!
  const matchRatio = matchedTokens.size / effectiveTokens.length;
  if (matchRatio >= 1) {
    score += 80;
    matchedDetails.push("All details matched");
  } else if (matchRatio >= 0.66) {
    score += 35;
  }

  return {
    score,
    matchedTokensCount: matchedTokens.size,
    matchedDetails,
  };
}

/**
 * Filters and sorts items with high-precision scoring so small details are never missed
 */
export function rankItemsByQuery<T extends {
  title: string;
  description?: string | null;
  location?: string | null;
  category?: string | null;
  poster_name?: string | null;
  created_at?: string;
}>(items: T[], query: string): T[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return items;

  const scored = items.map((item) => {
    const { score, matchedTokensCount, matchedDetails } = scoreItemMatch(item, cleanQuery);
    return { item, score, matchedTokensCount, matchedDetails };
  });

  // Keep items with a positive score
  const matches = scored.filter((entry) => entry.score > 0);

  // Sort by score descending; if score tied, prefer newer items
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const dateA = a.item.created_at ? new Date(a.item.created_at).getTime() : 0;
    const dateB = b.item.created_at ? new Date(b.item.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return matches.map((entry) => entry.item);
}

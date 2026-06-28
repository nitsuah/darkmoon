/**
 * Shared profanity word list for client and server-side filtering.
 * Used by both Solo.tsx client-side filter and server profanity.js.
 */
export const BAD_WORDS = [
  "fuck",
  "shit",
  "damn",
  "bitch",
  "asshole",
  "bastard",
  "crap",
  "piss",
  "dick",
  "cock",
  "pussy",
  "fag",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "whore",
  "slut",
  "cunt",
  "motherfucker",
  "fucker",
  "dipshit",
  "dumbass",
  "jackass",
] as const;

/**
 * Escapes special regex characters in a string for safe use in RegExp.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Filters profanity from text by replacing bad words with asterisks.
 * Uses word boundary matching to avoid partial word matches.
 *
 * @param text - The text to filter
 * @param customWords - Optional additional words to filter (merged with BAD_WORDS)
 * @returns Filtered text with bad words replaced by asterisks
 */
export function filterProfanity(
  text: string,
  customWords: string[] = [],
): string {
  if (!text) return text;

  const wordsToFilter = [...BAD_WORDS, ...customWords];
  let filtered = text;

  wordsToFilter.forEach((word) => {
    // Use word boundaries (\b) to match whole words only
    // This prevents matching "hello" when filtering "hell"
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    filtered = filtered.replace(regex, "*".repeat(word.length));
  });

  return filtered;
}

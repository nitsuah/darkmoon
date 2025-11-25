import { describe, it, expect } from "vitest";
import {
  BAD_WORDS,
  escapeRegex,
  filterProfanity,
} from "../lib/constants/profanity";

describe("Profanity Filter", () => {
  describe("escapeRegex", () => {
    it("should escape special regex characters", () => {
      expect(escapeRegex("hello.world")).toBe("hello\\.world");
      expect(escapeRegex("test*")).toBe("test\\*");
      expect(escapeRegex("a+b")).toBe("a\\+b");
      expect(escapeRegex("(test)")).toBe("\\(test\\)");
      expect(escapeRegex("[abc]")).toBe("\\[abc\\]");
    });

    it("should not modify strings without special characters", () => {
      expect(escapeRegex("hello")).toBe("hello");
      expect(escapeRegex("test123")).toBe("test123");
    });
  });

  describe("filterProfanity", () => {
    it("should filter basic profanity with asterisks", () => {
      const result = filterProfanity("This is a fuck test");
      expect(result).toBe("This is a **** test");
    });

    it("should be case-insensitive", () => {
      expect(filterProfanity("FUCK this")).toBe("**** this");
      expect(filterProfanity("FuCk this")).toBe("**** this");
      expect(filterProfanity("fuck THIS")).toBe("**** THIS");
    });

    it("should use word boundary matching to avoid partial matches", () => {
      // "hello" should NOT match when filtering "hell"
      const result = filterProfanity("hello world");
      expect(result).toBe("hello world");

      // But "hell" as standalone word should match if in BAD_WORDS
      // (Currently "hell" is not in our list, but testing the boundary logic)
      const resultWithHell = filterProfanity("what the hell", ["hell"]);
      expect(resultWithHell).toBe("what the ****");
    });

    it("should filter multiple bad words in one string", () => {
      const result = filterProfanity("fuck this shit");
      expect(result).toBe("**** this ****");
    });

    it("should filter all words from BAD_WORDS constant", () => {
      BAD_WORDS.forEach((word) => {
        const result = filterProfanity(`This is ${word} bad`);
        expect(result).toBe(`This is ${"*".repeat(word.length)} bad`);
      });
    });

    it("should handle empty or null text gracefully", () => {
      expect(filterProfanity("")).toBe("");
      // Use a small wrapper function to exercise null / undefined inputs without unsafe casts
      const callNullable = (t: string | null | undefined) => {
        // filterProfanity is typed to accept string and return string. We want to
        // ensure runtime behavior when null/undefined is passed is preserved. Use
        // a narrow @ts-expect-error to indicate intentional unsafe input for test.
        // @ts-expect-error intentional runtime test for null/undefined
        return filterProfanity(t);
      };

      expect(callNullable(null)).toBe(null);
      expect(callNullable(undefined)).toBe(undefined);
    });

    it("should accept custom words to filter", () => {
      const result = filterProfanity("apple banana orange", [
        "apple",
        "orange",
      ]);
      expect(result).toBe("***** banana ******");
    });

    it("should merge custom words with BAD_WORDS", () => {
      const result = filterProfanity("fuck and apple", ["apple"]);
      expect(result).toBe("**** and *****");
    });

    it("should preserve punctuation and spacing", () => {
      const result = filterProfanity("What the fuck? This is shit!");
      expect(result).toBe("What the ****? This is ****!");
    });

    it("should handle words at start and end of string", () => {
      expect(filterProfanity("fuck this")).toBe("**** this");
      expect(filterProfanity("this fuck")).toBe("this ****");
      expect(filterProfanity("fuck")).toBe("****");
    });

    it("should not filter substrings within larger words", () => {
      // "damn" is in BAD_WORDS, but "damnation" should not be filtered
      const result = filterProfanity("damnation is a word");
      expect(result).toBe("damnation is a word");

      // But standalone "damn" should be filtered
      const result2 = filterProfanity("oh damn");
      expect(result2).toBe("oh ****");
    });

    it("should handle repeated words", () => {
      const result = filterProfanity("fuck fuck fuck");
      expect(result).toBe("**** **** ****");
    });

    it("should normalize matching with word boundaries", () => {
      // Test that "damn" matches but "damnation" does not
      const result1 = filterProfanity("oh damn");
      expect(result1).toBe("oh ****");

      const result2 = filterProfanity("damnation");
      expect(result2).toBe("damnation"); // Should NOT filter partial match
    });
  });

  describe("BAD_WORDS constant", () => {
    it("should be an array", () => {
      expect(Array.isArray(BAD_WORDS)).toBe(true);
    });

    it("should contain expected profanity words", () => {
      expect(BAD_WORDS).toContain("fuck");
      expect(BAD_WORDS).toContain("shit");
      expect(BAD_WORDS).toContain("damn");
    });

    it("should have all lowercase words for consistency", () => {
      BAD_WORDS.forEach((word) => {
        expect(word).toBe(word.toLowerCase());
      });
    });

    it("should not have duplicate entries", () => {
      const uniqueWords = new Set(BAD_WORDS);
      expect(uniqueWords.size).toBe(BAD_WORDS.length);
    });
  });
});

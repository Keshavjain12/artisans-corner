/**
 * One place to turn a shopper's words into something safe to hand a RegExp.
 *
 * Three controllers had grown their own copy of this, and the store directory
 * had none at all - it interpolated the raw query string, which is both a
 * regex-injection and a denial of service waiting to happen: `(a+)+$` costs
 * seconds of CPU per request.
 *
 * Every metacharacter is escaped rather than stripped. Stripping looks safer
 * but quietly changes meaning: dropping the dots from "sam@example.com" leaves
 * the words "sam@example" and "com", and an OR across those matches every
 * address at every .com domain. Escaped, the pattern contains no quantifiers,
 * groups or anchors at all, so there is nothing left to exploit.
 */

const METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/** Quotes a word so every character in it is matched literally. */
export const escapeRegex = (value) => String(value ?? '').replace(METACHARACTERS, '\\$&');

/** Collapses whitespace and caps the length; the content is left alone. */
export const safeSearchTerm = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

export const searchWords = (value) => safeSearchTerm(value).split(' ').filter(Boolean);

/** A case-insensitive regex matching one word literally. */
export const wordRegex = (word) => new RegExp(escapeRegex(word), 'i');

/**
 * A case-insensitive regex matching any of the words, or null when there is
 * nothing to search for - so callers can skip the filter entirely.
 */
export function searchRegex(value) {
  const words = searchWords(value);
  if (words.length === 0) return null;
  return new RegExp(words.map(escapeRegex).join('|'), 'i');
}

export default searchRegex;

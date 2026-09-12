const METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

export const escapeRegex = (value) => String(value ?? '').replace(METACHARACTERS, '\\$&');

export const safeSearchTerm = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

export const searchWords = (value) => safeSearchTerm(value).split(' ').filter(Boolean);

export const wordRegex = (word) => new RegExp(escapeRegex(word), 'i');

export function searchRegex(value) {
  const words = searchWords(value);
  if (words.length === 0) return null;
  return new RegExp(words.map(escapeRegex).join('|'), 'i');
}

export default searchRegex;

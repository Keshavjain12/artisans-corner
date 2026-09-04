export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/**
 * Produces a slug that does not collide with an existing document.
 * `exists` receives a candidate slug and resolves true when it is taken.
 */
export async function uniqueSlug(base, exists) {
  const root = slugify(base) || 'item';
  let candidate = root;
  let n = 1;
   
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
   
  return candidate;
}

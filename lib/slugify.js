export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // accents
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

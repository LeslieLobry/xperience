// /lib/from.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildFrom({ envFrom = process.env.EMAIL_FROM, fallbackName = "Xpérience" } = {}) {
  if (!envFrom) throw new Error("EMAIL_FROM manquant");
  let name = null;
  let email = envFrom.trim();
  const m = envFrom.match(/^\s*([^<]+?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) { name = m[1].replace(/["',\r\n]/g, " ").trim(); email = m[2].trim(); }
  if (!EMAIL_RE.test(email)) throw new Error(`EMAIL_FROM invalide: "${envFrom}"`);
  if (!name || !name.length) name = fallbackName;
  return `${name} <${email}>`;
}

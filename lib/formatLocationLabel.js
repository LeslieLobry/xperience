export function formatLocationLabel(user = {}, options = {}) {
  const { showCountry = false, showPostalCode = true } = options;

  const rawCity = cleanValue(user.localisation || user.ville || user.city);
  const postalCode = formatPostalCode(cleanValue(user.codePostal || user.postalCode || user.deptCode));
  const deptCode = formatDeptCode(postalCode || cleanValue(user.deptCode));
  const country = normalizeCountry(cleanValue(user.country || user.pays));

  if (!rawCity) return "";

  const city = sanitizeCity(rawCity);

  const isFrance = !country || country === "France";

  // France : Lille (59) ou Lille (59000)
  if (isFrance) {
    if (!showPostalCode) return city;

    // Je te conseille département sur les cards : plus court
    return deptCode ? `${city} (${deptCode})` : city;
  }

  // Étranger sans pays sur page accueil
  if (!showCountry) {
    return city;
  }

  // Étranger avec pays sur fiche profil
  return `${city}, ${country}`;
}

function cleanValue(value) {
  if (value == null) return "";
  return String(value).trim();
}

function formatPostalCode(code) {
  if (!code) return "";

  const cleaned = String(code).trim();

  if (/^\d{5}$/.test(cleaned)) return cleaned;
  if (/^\d{2,3}$/.test(cleaned)) return cleaned;

  return "";
}

function formatDeptCode(code) {
  if (!code) return "";

  const cleaned = String(code).trim();

  if (/^\d{5}$/.test(cleaned)) return cleaned.slice(0, 2);
  if (/^\d{2,3}$/.test(cleaned)) return cleaned;

  return "";
}

function sanitizeCity(value) {
  return cleanValue(value)
    .replace(/,\s*\((\d{2,3})\)\s*,?\s*france$/i, "")
    .replace(/\s*\((\d{2,3})\)\s*,?\s*france$/i, "")
    .replace(/,\s*france$/i, "")
    .replace(/,\s*belgium$/i, "")
    .replace(/,\s*belgique$/i, "")
    .replace(/,\s*germany$/i, "")
    .replace(/,\s*allemagne$/i, "")
    .replace(/,\s*spain$/i, "")
    .replace(/,\s*espagne$/i, "")
    .replace(/,\s*italy$/i, "")
    .replace(/,\s*italie$/i, "")
    .replace(/,\s*portugal$/i, "")
    .replace(/,\s*switzerland$/i, "")
    .replace(/,\s*suisse$/i, "")
    .replace(/,\s*luxembourg$/i, "")
    .replace(/,\s*netherlands$/i, "")
    .replace(/,\s*the netherlands$/i, "")
    .replace(/,\s*pays-bas$/i, "")
    .replace(/,\s*united kingdom$/i, "")
    .replace(/,\s*royaume-uni$/i, "")
    .replace(/\s*\((wallonia|flanders|vlaanderen|brussels|bruxelles)\)\s*$/i, "")
    .replace(/\s*\(([^)]+)\)\s*$/i, "")
    .replace(/,\s*$/, "")
    .trim();
}

function normalizeCountry(country) {
  if (!country) return "";

  const key = cleanValue(country);

  const map = {
    France: "France",
    Belgium: "Belgique",
    Belgique: "Belgique",
    Germany: "Allemagne",
    Allemagne: "Allemagne",
    Spain: "Espagne",
    Espagne: "Espagne",
    Italy: "Italie",
    Italie: "Italie",
    Portugal: "Portugal",
    Switzerland: "Suisse",
    Suisse: "Suisse",
    Luxembourg: "Luxembourg",
    Netherlands: "Pays-Bas",
    "The Netherlands": "Pays-Bas",
    "Pays-Bas": "Pays-Bas",
    "United Kingdom": "Royaume-Uni",
    "Royaume-Uni": "Royaume-Uni",
    UK: "Royaume-Uni",
    England: "Royaume-Uni",
    Scotland: "Royaume-Uni",
    Ireland: "Irlande",
    Irlande: "Irlande",
    "United States": "États-Unis",
    USA: "États-Unis",
    Canada: "Canada",
    Morocco: "Maroc",
    Maroc: "Maroc",
    Tunisia: "Tunisie",
    Tunisie: "Tunisie",
    Algeria: "Algérie",
    Algérie: "Algérie",
  };

  return map[key] || key;
}
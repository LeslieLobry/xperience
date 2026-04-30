export function formatLocationLabel(user = {}) {
  const rawCity = cleanValue(user.localisation);
  const deptCode = formatDeptCode(cleanValue(user.deptCode));
  const country = normalizeCountry(cleanValue(user.country));

  if (!rawCity) return "";

  const city = sanitizeCity(rawCity);

  // France => Lille (59)
  if (country === "France") {
    return deptCode ? `${city} (${deptCode})` : city;
  }

  // Étranger => Bruges, Belgique
  if (country) {
    return `${city}, ${country}`;
  }

  return city;
}

function cleanValue(value) {
  if (value == null) return "";
  return String(value).trim();
}

function formatDeptCode(code) {
  if (!code) return "";

  const cleaned = String(code).trim();

  // Code postal français classique : 59000 => 59
  if (/^\d{5}$/.test(cleaned)) {
    return cleaned.slice(0, 2);
  }

  // Département déjà fourni : 59, 75, 971...
  if (/^\d{2,3}$/.test(cleaned)) {
    return cleaned;
  }

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

  return map[country] || country;
}
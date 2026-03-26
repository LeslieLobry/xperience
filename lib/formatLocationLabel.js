export function formatLocationLabel(user = {}) {
  const rawCity = cleanValue(user.localisation);
  const deptCode = cleanValue(user.deptCode);
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

function sanitizeCity(value) {
  return cleanValue(value)
    .replace(/,\s*\((\d{2,3})\)\s*,?\s*france$/i, "")
    .replace(/\s*\((\d{2,3})\)\s*,?\s*france$/i, "")
    .replace(/,\s*france$/i, "")
    .replace(/,\s*belgium$/i, "")
    .replace(/,\s*belgique$/i, "")
    .replace(/,\s*united kingdom$/i, "")
    .replace(/,\s*royaume-uni$/i, "")
    .replace(/\s*\((wallonia|flanders|vlaanderen|brussels|bruxelles)\)\s*$/i, "")
    .replace(/\s*\(([^)]+)\)\s*$/i, (match, content) => {
      if (/^\d{2,3}$/.test(content.trim())) {
        return "";
      }
      return "";
    })
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
    Luxembourg: "Luxembourg",
    Netherlands: "Pays-Bas",
    "The Netherlands": "Pays-Bas",
    "United Kingdom": "Royaume-Uni",
    UK: "Royaume-Uni",
    England: "Royaume-Uni",
    Scotland: "Royaume-Uni",
    Ireland: "Irlande",
    "United States": "États-Unis",
    USA: "États-Unis",
    Canada: "Canada",
    Morocco: "Maroc",
    Tunisia: "Tunisie",
    Algeria: "Algérie",
  };

  return map[country] || country;
}
export function formatLocationLabel(user = {}) {
  const city = cleanValue(user.localisation);
  const deptCode = cleanValue(user.deptCode);
  const country = normalizeCountry(cleanValue(user.country));

  if (!city) return "";

  // France => Lille (59)
  if (country === "France") {
    return deptCode ? `${city} (${deptCode})` : city;
  }

  // Étranger => Bruges, Belgique
  if (country) {
    return `${city}, ${country}`;
  }

  // Fallback
  return city;
}

function cleanValue(value) {
  if (value == null) return "";
  return String(value).trim();
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
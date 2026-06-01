export function formatLocationLabel(user = {}) {
  const rawLocation = cleanValue(user.localisation);

  if (!rawLocation) return "";

  return sanitizeLocation(rawLocation);
}

function cleanValue(value) {
  if (value == null) return "";
  return String(value).trim();
}

function sanitizeLocation(value) {
  return cleanValue(value)

    // 🇫🇷 anciens formats français
    // Exemple : Grenoble, (38), France => Grenoble (38)
    .replace(/,\s*\((\d{2,3})\),\s*France$/i, " ($1)")

    // Exemple : Lille, France => Lille
    .replace(/,\s*France$/i, "")

    // 🌍 pays étrangers en français
    .replace(/,\s*Belgium$/i, ", Belgique")
    .replace(/,\s*Belgique$/i, ", Belgique")

    .replace(/,\s*Germany$/i, ", Allemagne")
    .replace(/,\s*Allemagne$/i, ", Allemagne")

    .replace(/,\s*Spain$/i, ", Espagne")
    .replace(/,\s*Espagne$/i, ", Espagne")

    .replace(/,\s*Italy$/i, ", Italie")
    .replace(/,\s*Italie$/i, ", Italie")

    .replace(/,\s*Portugal$/i, ", Portugal")

    .replace(/,\s*Switzerland$/i, ", Suisse")
    .replace(/,\s*Suisse$/i, ", Suisse")

    .replace(/,\s*Luxembourg$/i, ", Luxembourg")

    .replace(/,\s*Netherlands$/i, ", Pays-Bas")
    .replace(/,\s*The Netherlands$/i, ", Pays-Bas")
    .replace(/,\s*Pays-Bas$/i, ", Pays-Bas")

    .replace(/,\s*United Kingdom$/i, ", Royaume-Uni")
    .replace(/,\s*UK$/i, ", Royaume-Uni")
    .replace(/,\s*England$/i, ", Royaume-Uni")
    .replace(/,\s*Scotland$/i, ", Royaume-Uni")
    .replace(/,\s*Royaume-Uni$/i, ", Royaume-Uni")

    .replace(/,\s*Ireland$/i, ", Irlande")
    .replace(/,\s*Irlande$/i, ", Irlande")

    .replace(/,\s*United States$/i, ", États-Unis")
    .replace(/,\s*USA$/i, ", États-Unis")
    .replace(/,\s*États-Unis$/i, ", États-Unis")

    .replace(/,\s*Canada$/i, ", Canada")

    .replace(/,\s*Morocco$/i, ", Maroc")
    .replace(/,\s*Maroc$/i, ", Maroc")

    .replace(/,\s*Tunisia$/i, ", Tunisie")
    .replace(/,\s*Tunisie$/i, ", Tunisie")

    .replace(/,\s*Algeria$/i, ", Algérie")
    .replace(/,\s*Algérie$/i, ", Algérie")

    // Nettoyage régions inutiles
    .replace(
      /\s*\((wallonia|flanders|vlaanderen|brussels|bruxelles)\)\s*$/i,
      ""
    )

    // Nettoyage virgule finale
    .replace(/,\s*$/, "")

    .trim();
}
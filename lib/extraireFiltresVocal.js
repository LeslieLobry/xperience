// utils/extraireFiltresVocal.js

const OPTIONS = {
  type: ["homme", "femme", "couple", "groupe"],
  orientation: ["hétéro", "bi", "pan", "ouvert"],
  rechercheType: [
    "je le garde pour moi", "virtuel uniquement", "virtuel et peut-être plus", "réel seulement", "réel & virtuel",
    "je ne sais pas, c’est à voir", "aventure d’un soir", "relation secrète", "relation à long terme"
  ],
  recherches: [
    "hommes hétéros", "femmes hétéros", "couples hétéros", "couples f bi", "couples h bi", "couples bi",
    "hommes bi", "gays", "femmes bi", "lesbiennes", "travestis", "transgenres"
  ],
  envies: [
    "2+2", "bdsm", "cam", "candaulisme", "chat", "côte-à-côtisme", "curieux",
    "duo", "echangisme", "exhibition", "extreme", "feeling", "fétichisme",
    "gang bang", "hard", "mélangisme", "papouilles", "photos", "pluralité",
    "scénario", "soft", "trio", "vidéos", "voyeurisme"
  ],
  experience: [
    "a découvrir", "débutant", "occasionnel", "expérimenté", "je la garde pour moi"
  ],
  fumeur: ["fumeur", "non fumeur", "occasionnel"],
  silhouette: [
    "mince", "moyenne", "rond", "ronde", "athlétique", "sportif", "pulpeuse", "normal"
  ],
  taille: [
    "petite", "petit", "moyenne", "grande", "grand"
  ],
  origines: [
    "européen", "maghrébin", "africain", "asiatique", "métisse", "autre"
  ],
  yeux: [
    "bleu", "bleus", "vert", "verts", "marron", "noir", "noirs", "gris", "noisette"
  ],
  cheveux: [
    "blond", "blonds", "brun", "bruns", "noir", "noirs", "roux", "châtain", "châtains", "gris", "rasé", "rasés", "long", "longs", "court", "courts"
  ]
};

function normalizeText(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Cherche si un mot (ou sa forme sans s final) est inclus dans le texte
function includesWord(text, word) {
  word = normalizeText(word);
  text = normalizeText(text);
  if (text.includes(word)) return true;
  // gestion pluriel simple : enlève un s final
  if (word.endsWith("s")) {
    const singular = word.slice(0, -1);
    if (text.includes(singular)) return true;
  }
  return false;
}

function extraireFiltresVocal(texte) {
  texte = normalizeText(texte);
  let filtres = {};

  // Parcours des options et filtre par présence (plus souple)
  for (const key in OPTIONS) {
    filtres[key] = OPTIONS[key].filter(opt => includesWord(texte, opt));
  }

  // Extraction âge plus permissive

  // 1. "entre X et Y ans"
  const entreMatch = texte.match(/entre\s*(\d{1,3})\s*(?:et|à|-)\s*(\d{1,3})\s*ans?/);
  if (entreMatch) {
    filtres.ageMin = String(entreMatch[1]);
    filtres.ageMax = String(entreMatch[2]);
  } else {
    // 2. "plus de X ans"
    const plusDe = texte.match(/plus de\s*(\d{1,3})\s*ans?/);
    if (plusDe) filtres.ageMin = String(plusDe[1]);

    // 3. "moins de Y ans"
    const moinsDe = texte.match(/moins de\s*(\d{1,3})\s*ans?/);
    if (moinsDe) filtres.ageMax = String(moinsDe[1]);

    // 4. "de X ans" (âge fixe)
    const deAge = texte.match(/de\s+(\d{1,3})\s*ans?/);
    if (deAge) {
      filtres.ageMin = String(deAge[1]);
      filtres.ageMax = String(deAge[1]);
    }

    // 5. "X à Y ans" ou "X - Y ans"
    const ageRange = texte.match(/(\d{1,3})\s*(?:à|-|et)\s*(\d{1,3})\s*ans?/);
    if (ageRange) {
      filtres.ageMin = String(ageRange[1]);
      filtres.ageMax = String(ageRange[2]);
    } else {
      // 6. "minimum X"
      const ageMin = texte.match(/minimum\s*(\d{1,3})/);
      if (ageMin) filtres.ageMin = String(ageMin[1]);

      // 7. "maximum Y"
      const ageMax = texte.match(/maximum\s*(\d{1,3})/);
      if (ageMax) filtres.ageMax = String(ageMax[1]);
    }
  }

  // --- 1. Autour de moi (prioritaire) ---
  const autourDeMoi = /autour de moi|près de moi|à côté de moi|où je suis|ma position|proche de moi|près d'ici|autour d'ici|dans mon secteur|à proximité|près de chez moi|près de ma position/.test(texte);

  // Match : "à 20km de moi", "à 20 km autour de moi", "autour de moi à 20km", "autour de moi dans un rayon de 30km"
  const rayonMoiMatch1 = texte.match(/à\s*(\d{1,3})\s*km\s*(?:de|autour de)?\s*(moi|ici)/);
  const rayonMoiMatch2 = texte.match(/autour de moi.*?(?:à|dans un rayon de|dans un périmètre de)?\s*(\d{1,3})\s*km/);

  if (autourDeMoi || rayonMoiMatch1) {
    filtres.autourDeMoi = true;
    if (rayonMoiMatch1 && rayonMoiMatch1[1]) {
      filtres.rayon = rayonMoiMatch1[1];
    } else if (rayonMoiMatch2 && rayonMoiMatch2[1]) {
      filtres.rayon = rayonMoiMatch2[1];
    }
  }

  // --- 2. Autour d'une ville (ex : autour de Lille, à 30 km de Paris) ---
  if (!filtres.autourDeMoi) {
    const autourVilleMatch = texte.match(/(?:autour de|près de|à|vers|dans la région de)\s*([a-zéèêàùç\- ]+?)(?:\s*à\s*(\d{1,3})\s*km)?(?! de moi| d'ici)/i);
    if (autourVilleMatch) {
      filtres.localisation = autourVilleMatch[1].trim();
      if (autourVilleMatch[2]) filtres.rayon = autourVilleMatch[2];
    } else {
      const rayonMatch = texte.match(/à\s*(\d{1,3})\s*(km|kilomètres?)\s*de\s*([a-zéèêàùç\- ]+)/i);
      if (rayonMatch) {
        filtres.rayon = rayonMatch[1];
        filtres.localisation = rayonMatch[3].trim();
      }
    }
  }

  // --- 3. Les gens de [ville] EXACTEMENT (corrigé !) ---
  if (!filtres.autourDeMoi && !filtres.localisation) {
    const villeExactMatch = texte.match(/(?:de|à|sur)\s+([a-zéèêàùç\- ]{2,})(?:[\s,.!]|$)/i);
    if (villeExactMatch) {
      filtres.localisation = villeExactMatch[1].trim();
      filtres.rayon = ""; // Filtre strict
    }
  }

  // Avec photo / description
  if (texte.includes("photo")) filtres.photo = true;
  if (texte.includes("description")) filtres.description = true;

  // Statut (ne pas appliquer "all" si autourDeMoi)
  if (texte.includes("en ligne")) filtres.statut = "en_ligne";
  else if ((texte.includes("tous") || texte.includes("tout le monde")) && !filtres.autourDeMoi) filtres.statut = "all";

  // Pseudo
  const pseudoMatch = texte.match(/pseudo (\w+)/i);
  if (pseudoMatch) filtres.pseudo = pseudoMatch[1];

  // Correction autourDeMoi
  if (filtres.autourDeMoi) {
    delete filtres.localisation;
    delete filtres.rayon;
    if (filtres.statut === "all") delete filtres.statut;
  }

  // Nettoyage des tableaux vides
  Object.keys(filtres).forEach(k => {
    if (Array.isArray(filtres[k]) && filtres[k].length === 0) delete filtres[k];
  });

  return filtres;
}

export { extraireFiltresVocal, OPTIONS };

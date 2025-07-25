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

const SYNONYMES = {
  athletic: "athlétique",
  sporty: "sportif",
  slim: "mince",
  thin: "mince",
  fat: "rond",
  curvy: "pulpeuse",
  normal: "normal",
  tall: "grand",
  short: "petit",
  petite: "petite",
  european: "européen",
  african: "africain",
  asian: "asiatique",
  mixed: "métisse",
  white: "européen",
  black: "noir",
  blue: "bleu",
  green: "vert",
  hazel: "noisette",
  brown: "marron",
  blond: "blond",
  blonde: "blond",
  brunette: "brun",
  redhead: "roux",
  shaved: "rasé",
  bald: "rasé",
  longhair: "long",
  shorthair: "court"
};

function normalizeText(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesWord(text, word) {
  word = normalizeText(word);
  text = normalizeText(text);
  if (text.includes(word)) return true;
  if (word.endsWith("s")) {
    const singular = word.slice(0, -1);
    if (text.includes(singular)) return true;
  }
  return false;
}

function extraireFiltresVocal(texte) {
  texte = normalizeText(texte);

  // Applique les synonymes
  for (const [mot, remplacement] of Object.entries(SYNONYMES)) {
    const regex = new RegExp(`\\b${mot}\\b`, "g");
    texte = texte.replace(regex, remplacement);
  }

  let filtres = {};
  for (const key in OPTIONS) {
    filtres[key] = OPTIONS[key].filter(opt => includesWord(texte, opt));
  }

  const entreMatch = texte.match(/entre\s*(\d{1,3})\s*(?:et|à|-)\s*(\d{1,3})\s*ans?/);
  if (entreMatch) {
    filtres.ageMin = String(entreMatch[1]);
    filtres.ageMax = String(entreMatch[2]);
  } else {
    const plusDe = texte.match(/plus de\s*(\d{1,3})\s*ans?/);
    if (plusDe) filtres.ageMin = String(plusDe[1]);
    const moinsDe = texte.match(/moins de\s*(\d{1,3})\s*ans?/);
    if (moinsDe) filtres.ageMax = String(moinsDe[1]);
    const deAge = texte.match(/de\s+(\d{1,3})\s*ans?/);
    if (deAge) {
      filtres.ageMin = String(deAge[1]);
      filtres.ageMax = String(deAge[1]);
    }
    const ageRange = texte.match(/(\d{1,3})\s*(?:à|-|et)\s*(\d{1,3})\s*ans?/);
    if (ageRange) {
      filtres.ageMin = String(ageRange[1]);
      filtres.ageMax = String(ageRange[2]);
    } else {
      const ageMin = texte.match(/minimum\s*(\d{1,3})/);
      if (ageMin) filtres.ageMin = String(ageMin[1]);
      const ageMax = texte.match(/maximum\s*(\d{1,3})/);
      if (ageMax) filtres.ageMax = String(ageMax[1]);
    }
  }

  const autourDeMoi = /autour de moi|près de moi|à côté de moi|où je suis|ma position|proche de moi|près d'ici|autour d'ici|dans mon secteur|à proximité|près de chez moi|près de ma position/.test(texte);
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

  if (!filtres.autourDeMoi && !filtres.localisation) {
    const villeExactMatch = texte.match(/(?:de|à|sur)\s+([a-zéèêàùç\- ]{2,})(?:[\s,.!]|$)/i);
    if (villeExactMatch) {
      filtres.localisation = villeExactMatch[1].trim();
      filtres.rayon = "";
    }
  }

  if (texte.includes("photo")) filtres.photo = true;
  if (texte.includes("description")) filtres.description = true;
  if (texte.includes("en ligne")) filtres.statut = "en_ligne";
  else if ((texte.includes("tous") || texte.includes("tout le monde")) && !filtres.autourDeMoi) filtres.statut = "all";

  const pseudoMatch = texte.match(/pseudo (\w+)/i);
  if (pseudoMatch) filtres.pseudo = pseudoMatch[1];

  if (filtres.autourDeMoi) {
    delete filtres.localisation;
    delete filtres.rayon;
    if (filtres.statut === "all") delete filtres.statut;
  }

  Object.keys(filtres).forEach(k => {
    if (Array.isArray(filtres[k]) && filtres[k].length === 0) delete filtres[k];
  });

  return filtres;
}

export { extraireFiltresVocal, OPTIONS };

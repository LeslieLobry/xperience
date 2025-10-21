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
  taille: ["petite", "petit", "moyenne", "grande", "grand"],
  origines: ["européen", "maghrébin", "africain", "asiatique", "métisse", "autre"],
  yeux: ["bleu", "bleus", "vert", "verts", "marron", "noir", "noirs", "gris", "noisette"],
  cheveux: [
    "blond", "blonds", "brun", "bruns", "noir", "noirs",
    "roux", "châtain", "châtains", "gris", "rasé", "rasés", "long", "longs", "court", "courts"
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

// Pour normaliser les options extraites (lowercase + sans accents)
function normalizeToDb(val) {
  return normalizeText(val);
}

function includesWord(text, word) {
  const w = normalizeText(word);
  const t = normalizeText(text);
  if (t.includes(w)) return true;
  // gestion basique des pluriels
  if (w.endsWith("s") && t.includes(w.slice(0, -1))) return true;
  return false;
}

function dedupeAndSingularize(array) {
  const unique = new Set();
  array.forEach((item) => {
    // retire un s final si présent
    const sing = item.endsWith("s") ? item.slice(0, -1) : item;
    unique.add(sing);
  });
  return [...unique];
}

function extraireFiltresVocal(texte) {
  // 1) normalisation initiale
  texte = normalizeText(texte);

  // 2) remplacement des synonymes anglais
  for (const [mot, rep] of Object.entries(SYNONYMES)) {
    const regex = new RegExp(`\\b${mot}\\b`, "g");
    texte = texte.replace(regex, rep);
  }

  const filtres = {};

  // 3) extraction + normalisation + déduplication pour chaque catégorie
  for (const key in OPTIONS) {
    const matches = OPTIONS[key].filter(opt => includesWord(texte, opt));
    filtres[key] = dedupeAndSingularize(matches.map(normalizeToDb));
  }

  // 4) extraction des plages d'âge
  const entre = texte.match(/entre\s*(\d{1,3})\s*(?:et|à|-)\s*(\d{1,3})\s*ans?/);
  if (entre) {
    filtres.ageMin = entre[1];
    filtres.ageMax = entre[2];
  } else {
    const plusDe = texte.match(/plus de\s*(\d{1,3})\s*ans?/);
    if (plusDe) filtres.ageMin = plusDe[1];
    const moinsDe = texte.match(/moins de\s*(\d{1,3})\s*ans?/);
    if (moinsDe) filtres.ageMax = moinsDe[1];
    const fixe = texte.match(/de\s+(\d{1,3})\s*ans?/);
    if (fixe) {
      filtres.ageMin = fixe[1];
      filtres.ageMax = fixe[1];
    }
    const range = texte.match(/(\d{1,3})\s*(?:à|-|et)\s*(\d{1,3})\s*ans?/);
    if (range) {
      filtres.ageMin = range[1];
      filtres.ageMax = range[2];
    }
    const min = texte.match(/minimum\s*(\d{1,3})/);
    if (min) filtres.ageMin = min[1];
    const max = texte.match(/maximum\s*(\d{1,3})/);
    if (max) filtres.ageMax = max[1];
  }

  // 5) localisation "autour de moi" ou ville
  const autourDeMoi = /autour de moi|près de moi|à côté de moi|où je suis/.test(texte);
  const r1 = texte.match(/à\s*(\d{1,3})\s*km\s*(?:de|autour de)?\s*(moi|ici)/);
  const r2 = texte.match(/autour de moi.*?(\d{1,3})\s*km/);
  if (autourDeMoi || r1) {
    filtres.autourDeMoi = true;
    if (r1) filtres.rayon = r1[1];
    else if (r2) filtres.rayon = r2[1];
  } else {
    const av = texte.match(/(?:autour de|près de|à)\s*([a-zàâäéèêëïîôöùûüç \-]+?)(?:\s*à\s*(\d{1,3})\s*km)?/i);
    if (av) {
      filtres.localisation = av[1].trim();
      if (av[2]) filtres.rayon = av[2];
    } else {
      const ex = texte.match(/(?:de|à )\s+([a-zàâäéèêëïîôöùûüç \-]{2,})(?:\s|$)/i);
      if (ex) {
        filtres.localisation = ex[1].trim();
        filtres.rayon = "";
      }
    }
  }

  // 6) photo / description / statut / pseudo
  if (texte.includes("photo")) filtres.photo = true;
  if (texte.includes("description")) filtres.description = true;
  if (texte.includes("en ligne")) filtres.statut = "en_ligne";
  else if (/tous|tout le monde/.test(texte) && !filtres.autourDeMoi) filtres.statut = "all";

  const pseudoMatch = texte.match(/pseudo\s+(\w+)/i);
  if (pseudoMatch) filtres.pseudo = pseudoMatch[1];

  // 7) nettoyage final : retirer tableaux vides
  Object.keys(filtres).forEach(k => {
    if (Array.isArray(filtres[k]) && filtres[k].length === 0) {
      delete filtres[k];
    }
  });

  return filtres;
}

export { extraireFiltresVocal, OPTIONS };

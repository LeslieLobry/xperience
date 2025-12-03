// utils/extraireFiltresVocal.js

const OPTIONS = {
  type: ["homme", "femme", "couple", "groupe"],
  orientation: ["hétéro", "hetero", "bi", "pan", "ouvert"],
  rechercheType: [
    "je le garde pour moi", "virtuel uniquement", "virtuel et peut-être plus", "virtuel et peut etre plus",
    "réel seulement", "reel seulement", "réel & virtuel", "reel & virtuel",
    "je ne sais pas, c’est à voir", "je ne sais pas, c est a voir", "aventure d’un soir", "aventure d un soir",
    "relation secrète", "relation secrete", "relation à long terme", "relation a long terme"
  ],
  recherches: [
    "hommes hétéros", "hommes heteros", "femmes hétéros", "femmes heteros",
    "couples hétéros", "couples heteros", "couples f bi", "couples h bi", "couples bi",
    "hommes bi", "gays", "femmes bi", "lesbiennes", "travestis", "transgenres"
  ],
  envies: [
    "2+2", "bdsm", "cam", "candaulisme", "chat", "côte-à-côtisme", "cote-a-cotisme", "curieux",
    "duo", "echangisme", "exhibition", "extreme", "feeling", "fétichisme", "fetichisme",
    "gang bang", "hard", "mélangisme", "melangisme", "papouilles", "photos", "pluralité", "pluralite",
    "scénario", "scenario", "soft", "trio", "vidéos", "videos", "voyeurisme"
  ],
  experience: [
    "a découvrir", "a decouvrir", "débutant", "debutant", "occasionnel", "expérimenté", "experimente", "je la garde pour moi"
  ],
  fumeur: ["fumeur", "non fumeur", "occasionnel"],
  silhouette: [
    "mince", "moyenne", "rond", "ronde", "athlétique", "athletique",
    "sportif", "pulpeuse", "normal"
  ],
  taille: ["petite", "petit", "moyenne", "grande", "grand"],
  origines: ["européen", "europeen", "maghrébin", "maghrebin", "africain", "asiatique", "métisse", "metisse", "autre"],
  yeux: ["bleu", "bleus", "vert", "verts", "marron", "noir", "noirs", "gris", "noisette"],
  cheveux: [
    "blond", "blonds", "brun", "bruns", "noir", "noirs",
    "roux", "châtain", "chatain", "châtains", "chatains",
    "gris", "rasé", "rase", "rasés", "rases",
    "long", "longs", "court", "courts"
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
  return String(txt || "")
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

function extraireFiltresVocal(inputTexte) {
  // 1) normalisation initiale
  let texte = normalizeText(inputTexte);

  // 2) remplacement des synonymes anglais
  for (const [mot, rep] of Object.entries(SYNONYMES)) {
    const regex = new RegExp(`\\b${normalizeText(mot)}\\b`, "g");
    texte = texte.replace(regex, normalizeText(rep));
  }

  const filtres = {};

  // 3) extraction + normalisation + déduplication pour chaque catégorie
  for (const key in OPTIONS) {
    const matches = OPTIONS[key].filter(opt => includesWord(texte, opt));
    const normalized = matches.map(normalizeToDb);
    const deduped = dedupeAndSingularize(normalized);
    if (deduped.length) filtres[key] = deduped;
  }

   // 4) extraction des plages d'âge
  (function extraireAge() {
    let ageMin;
    let ageMax;

    // entre 25 et 40 ans
    const entre = texte.match(
      /entre\s*(\d{1,3})\s*(?:et|a|-)\s*(\d{1,3})\s*ans?/,
    );
    if (entre) {
      ageMin = entre[1];
      ageMax = entre[2];
    }

    // 30-40 ans / 30 a 40 ans / 30 et 40 ans
    if (!ageMin && !ageMax) {
      const range = texte.match(
        /(\d{1,3})\s*(?:a|-|et)\s*(\d{1,3})\s*ans?/,
      );
      if (range) {
        ageMin = range[1];
        ageMax = range[2];
      }
    }

    // plus de 50 ans / au dessus de 50 ans / supérieur à 50
    if (!ageMin) {
      const plusDe = texte.match(
        /(?:plus de|au[- ]dessus de|superieur a)\s*(\d{1,3})\s*ans?/,
      );
      if (plusDe) ageMin = plusDe[1];

      const min = texte.match(/minimum\s*(\d{1,3})/);
      if (min) ageMin = min[1];
    }

    // moins de 50 ans / au dessous de 50 ans / inférieur à 50
    if (!ageMax) {
      const moinsDe = texte.match(
        /(?:moins de|au[- ]dessous de|inferieur a)\s*(\d{1,3})\s*ans?/,
      );
      if (moinsDe) ageMax = moinsDe[1];

      const max = texte.match(/maximum\s*(\d{1,3})/);
      if (max) ageMax = max[1];
    }

    // "de 30 ans" / "à 30 ans" (âge fixe)
    if (!ageMin && !ageMax) {
      const fixe = texte.match(
        /\b(?:de|a)\s+(\d{1,3})\s*ans?\b/,
      );
      if (fixe) {
        ageMin = fixe[1];
        ageMax = fixe[1];
      }
    }

    if (ageMin) filtres.ageMin = ageMin;
    if (ageMax) filtres.ageMax = ageMax;
  })();

  // 5) Localisation (sur/à/dans/vers/près de/autour de + rayon)
  function cleanVille(s) {
    if (!s) return "";
    return s
      .replace(/\s{2,}/g, " ")
      .replace(/^(de |d'|du |des |la |le |les )/i, "")
      .trim();
  }

  const autourDeMoi =
    /\b(autour de moi|pres de moi|près de moi|a c[oô]te de moi|a cote de moi|ou je suis|où je suis|ici)\b/.test(texte);

  let ville = "";
  let rayon = "";

  // cas 1 : distance + ville
  const distVille1 = texte.match(
    /(?:dans\s*(?:un\s*)?rayon\s*de|a|à)\s*(\d{1,3})\s*(?:km|kilometres?|kilom[eè]tres?)\s*(?:de|autour de|pres de|près de)?\s*([a-zàâäéèêëïîôöùûüç \-]{2,})/i
  );
  if (distVille1) {
    rayon = distVille1[1];
    ville = cleanVille(distVille1[2]);
  }

  // cas 2 : "autour de moi ... 20 km"
  if (!ville && autourDeMoi) {
    const r = texte.match(/(?:rayon\s*de|a|à)\s*(\d{1,3})\s*(?:km|kilometres?|kilom[eè]tres?)/i);
    if (r) rayon = r[1];
  }

  // cas 3 : ville seule avec prépositions ("à|sur|dans|vers <ville>")
  if (!ville) {
    const villePrep = texte.match(/\b(?:a|à|sur|dans|vers)\s+([a-zàâäéèêëïîôöùûüç \-]{2,})\b/i);
    if (villePrep) {
      const candidate = cleanVille(villePrep[1]);
      if (candidate && !/^(moi|ici)$/.test(candidate)) ville = candidate;
    }
  }

  // cas 4 : “près de|autour de|à côté de <ville>”
  if (!ville) {
    const villeProx = texte.match(/\b(?:pres de|près de|autour de|a c[oô]t[eé] de|a cote de)\s+([a-zàâäéèêëïîôöùûüç \-]{2,})\b/i);
    if (villeProx) ville = cleanVille(villeProx[1]);
  }

  // cas 5 : fallback “de|à <ville>”
  if (!ville) {
    const fallback = texte.match(/\b(?:de|a|à)\s+([a-zàâäéèêëïîôöùûüç \-]{2,})\b/i);
    if (fallback) {
      const candidate = cleanVille(fallback[1]);
      if (candidate && !/^(moi|ici)$/.test(candidate)) ville = candidate;
    }
  }

  if (autourDeMoi) filtres.autourDeMoi = true;
  if (rayon) filtres.rayon = rayon;
  if (ville) {
    // on garde la version normalisée (sans accents) dans les filtres
    filtres.localisation = normalizeToDb(ville);
    if (!filtres.rayon) filtres.rayon = ""; // cohérent avec ton code existant
  }

  // 6) photo / description / statut / pseudo
  if (texte.includes("photo")) filtres.photo = true;
  if (texte.includes("description")) filtres.description = true;
  if (/\ben ligne\b/.test(texte)) filtres.statut = "en_ligne";
  else if (/\b(tous|tout le monde)\b/.test(texte) && !filtres.autourDeMoi) filtres.statut = "all";

  const pseudoMatch = texte.match(/\bpseudo\s+([a-z0-9_\-]{2,})\b/i);
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

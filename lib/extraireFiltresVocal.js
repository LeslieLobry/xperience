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
    "mince", "moyenne", "rond", "rond(e)", "athlétique", "sportif", "pulpeuse", "normal"
  ],
  taille: [
    "petite", "moyenne", "grande"
  ],
  origines: [
    "européen", "maghrébin", "africain", "asiatique", "métisse", "autre"
  ],
  yeux: [
    "bleus", "verts", "marron", "noirs", "gris", "noisette"
  ],
  cheveux: [
    "blonds", "bruns", "noirs", "roux", "châtains", "gris", "rasés", "longs", "courts"
  ]
};

function extraireFiltresVocal(texte) {
  texte = texte.toLowerCase();
  let filtres = {};

  // Filtres classiques
  filtres.type = OPTIONS.type.filter(opt => texte.includes(opt));
  filtres.orientation = OPTIONS.orientation.filter(opt => texte.includes(opt));
  filtres.rechercheType = OPTIONS.rechercheType.filter(opt => texte.includes(opt));
  filtres.recherches = OPTIONS.recherches.filter(opt => texte.includes(opt));
  filtres.envies = OPTIONS.envies.filter(opt => texte.includes(opt));
  filtres.experience = OPTIONS.experience.filter(opt => texte.includes(opt));
  filtres.fumeur = OPTIONS.fumeur.filter(opt => texte.includes(opt));
  filtres.silhouette = OPTIONS.silhouette.filter(opt => texte.includes(opt));
  filtres.taille = OPTIONS.taille.filter(opt => texte.includes(opt));
  filtres.origines = OPTIONS.origines.filter(opt => texte.includes(opt));
  filtres.yeux = OPTIONS.yeux.filter(opt => texte.includes(opt));
  filtres.cheveux = OPTIONS.cheveux.filter(opt => texte.includes(opt));

  // Age min/max
  const ageRange = texte.match(/(\d{2})\s*(?:à|-|et)\s*(\d{2})\s*ans?/);
  if (ageRange) {
    filtres.ageMin = ageRange[1];
    filtres.ageMax = ageRange[2];
  } else {
    const ageMin = texte.match(/minimum (\d{2})/);
    if (ageMin) filtres.ageMin = ageMin[1];
    const ageMax = texte.match(/maximum (\d{2})/);
    if (ageMax) filtres.ageMax = ageMax[1];
  }

  // --- 1. Autour de moi (prioritaire) ---
  const autourDeMoi = /autour de moi|près de moi|à côté de moi|où je suis|ma position|proche de moi|près d'ici|autour d'ici/.test(texte);

  // Match : "à 20km de moi", "à 20 km autour de moi", "autour de moi à 20km", "autour de moi dans un rayon de 30km"
  const rayonMoiMatch1 = texte.match(/à\s*(\d{1,3})\s*km\s*(?:de|autour de)?\s*(moi|ici)/);
  const rayonMoiMatch2 = texte.match(/autour de moi.*?(?:à|dans un rayon de|dans un périmètre de)?\s*(\d{1,3})\s*km/);

  if (autourDeMoi || rayonMoiMatch1) {
    filtres.autourDeMoi = true;
    // On prend le rayon dans l'ordre de priorité où il est trouvé
    if (rayonMoiMatch1 && rayonMoiMatch1[1]) {
      filtres.rayon = rayonMoiMatch1[1];
    } else if (rayonMoiMatch2 && rayonMoiMatch2[1]) {
      filtres.rayon = rayonMoiMatch2[1];
    }
  }

  // --- 2. Autour d'une ville (ex : autour de Lille, à 30 km de Paris) ---
  // Ce cas ne doit matcher que si pas “autour de moi”
  if (!filtres.autourDeMoi) {
    const autourVilleMatch = texte.match(/(?:autour de|près de|à|vers|dans la région de)\s*([a-zéèêàùç\- ]+?)(?:\s*à\s*(\d{1,3})\s*km)?(?! de moi| d'ici)/i);
    if (autourVilleMatch) {
      filtres.localisation = autourVilleMatch[1].trim();
      // Si "à 30 km de Paris"
      if (autourVilleMatch[2]) filtres.rayon = autourVilleMatch[2];
    } else {
      // Rayon/distance explicite sans “moi”
      const rayonMatch = texte.match(/à\s*(\d{1,3})\s*(km|kilomètres?)\s*de\s*([a-zéèêàùç\- ]+)/i);
      if (rayonMatch) {
        filtres.rayon = rayonMatch[1];
        filtres.localisation = rayonMatch[3].trim();
      }
    }
  }

  // --- 3. Les gens de [ville] EXACTEMENT (corrigé !) ---
  if (!filtres.autourDeMoi && !filtres.localisation) {
    // Ex : "je veux les gens de Lille", "de Lille", "à Lille", "sur Lille"
    // On prend mini 2 lettres pour éviter "s"
    const villeExactMatch = texte.match(/(?:de|à|sur)\s+([a-zéèêàùç\- ]{2,})(?:[\s,.!]|$)/i);
    if (villeExactMatch) {
      filtres.localisation = villeExactMatch[1].trim();
      filtres.rayon = ""; // Rayon vide = filtre strict sur ville
    }
  }

  // Avec photo / description
  if (texte.includes("photo")) filtres.photo = true;
  if (texte.includes("description")) filtres.description = true;

  // Statut
  if (texte.includes("en ligne")) filtres.statut = "en_ligne";
  else if (texte.includes("tous") || texte.includes("tout le monde")) filtres.statut = "all";

  // Pseudo
  const pseudoMatch = texte.match(/pseudo (\w+)/i);
  if (pseudoMatch) filtres.pseudo = pseudoMatch[1];

  // Nettoyage des arrays vides
  Object.keys(filtres).forEach(k => {
    if (Array.isArray(filtres[k]) && filtres[k].length === 0) delete filtres[k];
  });

  return filtres;
}

export { extraireFiltresVocal, OPTIONS };

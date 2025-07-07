// lib/isProfilComplet.js

/**
 * Vérifie si un utilisateur a complété son profil.
 * - Si c'est un couple, check aussi les champs du partenaire.
 * - Ajoute ou enlève des champs selon tes besoins !
 */
export function isProfilComplet(user) {
  // Champs obligatoires communs
  const fields = [
    user.pseudo,
    user.email,
    user.orientation,
    user.age,
    user.localisation,
    user.description,
    user.photoUrl,
    user.taille,
    user.silhouette,
    user.origines,
  ];

  // Si couple, ajoute les champs partenaire
  if ((user.type || '').toLowerCase() === 'couple') {
    fields.push(
      user.age2,
      user.taille2,
      user.silhouette2,
      user.origines2
    );
  }

  // Vérifie qu'aucun champ n'est null, undefined, vide, ou (pour tableaux) vide
  return fields.every(
    (value) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)
  );
}

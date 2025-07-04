"use client";

export default function ProfilCompletionBox({ user }) {
  // Ici, tu retires Sexe et Photo de couverture de la liste !
  const profileFields = {
    "Pseudo": user.pseudo,
    "Email": user.email,
    "Orientation": user.orientation,
    "Âge": user.age,
    "Localisation": user.localisation,
    "Description": user.description,
    "Photo de profil": user.photoUrl,
    "Taille": user.taille,
    "Silhouette": user.silhouette,
    "Origines": user.origines,
  };

  // Si profil "couple", ajoute les champs du membre 2 (si tu veux)
  if (user.type?.toLowerCase() === "couple") {
    profileFields["Âge du/de la partenaire"] = user.age2;
    profileFields["Taille du/de la partenaire"] = user.taille2;
    profileFields["Silhouette du/de la partenaire"] = user.silhouette2;
    profileFields["Origines du/de la partenaire"] = user.origines2;
  }

  const totalFields = Object.keys(profileFields).length;

  const missingFields = Object.entries(profileFields)
    .filter(([_, value]) => !value || (Array.isArray(value) && value.length === 0))
    .map(([label]) => label);

  const completion = Math.round(((totalFields - missingFields.length) / totalFields) * 100);

  return (
    <div className="profil-completion-box">
      <h2>Devenez irrésistible, complétez votre profil !</h2>
      {completion < 100 ? (
        <>
          <p>Vous avez encore des informations à renseigner :</p>
          <ul className="missing-fields-list">
            {missingFields.map((champ) => (
              <li key={champ}>❌ {champ}</li>
            ))}
          </ul>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completion}%` }}></div>
          </div>
          <p className="completion-text">{completion}% complété</p>
        </>
      ) : (
        <>
          <p>✨ Félicitations, votre profil est entièrement complété !</p>
          <div className="progress-bar full">
            <div className="progress-fill" style={{ width: `100%` }}></div>
          </div>
          <p className="completion-text">100% complété</p>
        </>
      )}
    </div>
  );
}

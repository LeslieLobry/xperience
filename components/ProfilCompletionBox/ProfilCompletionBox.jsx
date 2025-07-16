"use client";
import { useEffect, useState, useRef } from "react";

/**
 * ProfilCompletionBox
 * @param {object}   user          - l'utilisateur
 * @param {function} onEditField   - (optionnel) fonction appelée au clic sur un champ à compléter
 */
export default function ProfilCompletionBox({ user, onEditField }) {
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

  const key = `profil-completion-done-${user.id || "current"}`;
  const [hideBox, setHideBox] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  // Vérifie si déjà terminé (localStorage)
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem(key) === "done") {
        setHideBox(true);
      }
    }
  }, [key]);

  // Gère le passage à 100%
  const prevCompletion = useRef(completion);

  useEffect(() => {
    if (hideBox) return;
    if (prevCompletion.current < 100 && completion === 100) {
      setShowCongrats(true);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          localStorage.setItem(key, "done");
        }
        setHideBox(true);
      }, 3000);
    }
    prevCompletion.current = completion;
  }, [completion, hideBox, key]);

  if (hideBox) return null;

  let boxContent = null;
  if (completion < 100) {
    boxContent = (
      <>
        <h2>Devenez irrésistible, complétez votre profil !</h2>
        <p>Vous avez encore des informations à renseigner :</p>
        <ul className="missing-fields-list">
          {missingFields.map((champ) => (
            <li key={champ}>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#e0c084",
                  textDecoration: "underline",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
                onClick={() => onEditField && onEditField(champ)}
              >
                ❌ {champ}
              </button>
            </li>
          ))}
        </ul>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${completion}%` }}></div>
        </div>
        <p className="completion-text">{completion}% complété</p>
      </>
    );
  } else if (showCongrats) {
    boxContent = (
      <>
        <h2>Devenez irrésistible, complétez votre profil !</h2>
        <p>✨ Félicitations, votre profil est entièrement complété !</p>
        <div className="progress-bar full">
          <div className="progress-fill" style={{ width: `100%` }}></div>
        </div>
        <p className="completion-text">100% complété</p>
        <p style={{ color: "#aaa", fontSize: "0.9em" }}>
          Cette box va disparaître automatiquement.
        </p>
      </>
    );
  }

  if (!boxContent) return null;

  return (
    <div className="profil-completion-box">
      {boxContent}
    </div>
  );
}

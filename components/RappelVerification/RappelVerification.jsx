"use client";

import { useAuth } from "../../context/AuthContext";
import "./RappelVerification.css";

export default function RappelVerification() {
  const { user } = useAuth();

  if (!user || user.verificationIdentiteStatut === true) return null;

  return (
    <div className="verification-alert">
      🔒Boostez la confiance sur votre profil !
      Pour attirer plus de membres, faites vérifier votre profil avec une <strong>pièce d'identité</strong> et un <strong>selfie</strong>.
      Aucun fichier n'est conservé après validation ✅
      Vous obtiendrez un <strong>badge vérifié</strong> affiché sur votre profil.   
      <a href="/verification-identite"> Vérifier mon identité</a>
    </div>
  );
}

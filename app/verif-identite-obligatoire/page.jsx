"use client";

import { useRouter } from "next/navigation";
import "./verif-identite-obligatoire.css";

export default function VerifIdentiteObligatoirePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/verification-identite");
  };

  return (
    <div className="verif-obligatoire-container">
      <h1>⚠️ Vérification d'identité requise</h1>
      <p>
        Votre délai de 48h est dépassé. Pour continuer à utiliser pleinement le site,
        vous devez vérifier votre identité via une pièce d'identité et un selfie.
      </p>
      <button onClick={handleStart}>Vérifier maintenant</button>
    </div>
  );
}

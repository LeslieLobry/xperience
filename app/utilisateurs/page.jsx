import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import ProfilDetailsSummary from "../../components/ProfilDetailsSummary/ProfilDetailsSummary";
import PreferencesSummary from "../../components/PreferencesSummary/PreferencesSummary";
import DescriptionCard from "../../components/DescriptionCard/DescriptionCard";
import AProposCard from "../../components/AProposCard/AProposCard";
import PhotoUploader from "../../components/PhotoUploader/PhotoUploader";
import CoverUploader from "../../components/CoverUploader/CoverUploader";
import GaleriePhotos from "../../components/GaleriePhotos/GaleriePhotos";

import "../utilisateurs/utilisateurs.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function ProfilPage() {
  // const token = cookies().get("token")?.value;
  const cookieStore = await cookies();
const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    return redirect("/connexion");
  }

  const user = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
    include: {
      recherches: true,
      photos: true,
    },
  });

  if (!user) return redirect("/connexion");

  function calculateProfileCompletion(user) {
    const fields = [
      'pseudo', 'email', 'sexe', 'orientation', 'age',
      'localisation', 'description', 'photoUrl', 'coverUrl',
      'taille', 'silhouette', 'origines'
    ];

    let completed = 0;
    for (let field of fields) {
      if (Array.isArray(user[field])) {
        if (user[field].length > 0) completed++;
      } else if (user[field] && user[field] !== '') {
        completed++;
      }
    }

    return Math.round((completed / fields.length) * 100);
  }

  const completion = calculateProfileCompletion(user);

  return (
    <div className="profil-page">
      {/* Zone cover avec photo en background */}
      <div className="cover-container">
        <div
          className="cover-photo"
          style={{
            backgroundImage: `url(${user.coverUrl || "/Assets/woman.jpg"})`,
          }}
        >
          <CoverUploader currentUrl={user.coverUrl} />
        </div>

        <div className="profil-avatar-wrapper">
          <div className="profil-avatar">
            <PhotoUploader currentUrl={user.photoUrl} />
          </div>
        </div>
      </div>

      <h1 className="profil-name">{user.pseudo}</h1>
      <span className="profil-status en-ligne">● EN LIGNE</span>
      <div className="profil-badge">{user.type} {user.orientation}</div>

      {/* Complétion du profil */}
      <div className="profil-completion-box">
        <h2>Devenez irrésistible, complétez votre profil !</h2>
        <p>
          Vous valoriserez ainsi davantage vos recherches tout en vous présentant
          sous votre meilleur jour.
        </p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${completion}%` }}
          ></div>
        </div>
        <p className="completion-text">{completion}% complété</p>
      </div>

      <div className="profil-infos-wrapper">
        <div className="info-block">
          <p><strong>Âge :</strong> <span>{user.age}</span></p>
          <p><strong>Silhouette :</strong> <span>{user.silhouette}</span></p>
          <p><strong>Localisation :</strong> <span>{user.localisation}</span></p>
          <p><strong>Origines :</strong> <span>{user.origines}</span></p>
          <p><strong>Taille :</strong> <span>{user.taille} cm</span></p>
        </div>
</div>

      <div className="profil-section">
        <DescriptionCard />
      </div>
      <div className="profil-section">
  <GaleriePhotos photos={user.photos || []} />
</div>

      <div className="profil-section">
        <PreferencesSummary />
      </div>

      <div className="profil-section">
        <ProfilDetailsSummary />
      </div>


      <div className="profil-section">
        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}

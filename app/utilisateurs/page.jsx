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
import "../utilisateurs/utilisateurs.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function ProfilPage() {
  const token = cookies().get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    return redirect("/connexion");
  }

  const user = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
    include: { recherches: true },
  });

  if (!user) return redirect("/connexion");

  return (
    <div className="profil-page">
      <div
        className="cover-photo"
        style={{ backgroundImage: `url(${user.coverUrl ||  "../Assets/woman.jpg"})` }}
      >
        <CoverUploader currentUrl={user.coverUrl} />
        <div className="profil-avatar-wrapper">
          <div className="profil-avatar">
            <PhotoUploader currentUrl={user.photoUrl} />
          </div>
        </div>
      </div>

      <h1 className="profil-name">{user.pseudo}</h1>
      <span className="profil-status en-ligne">● EN LIGNE</span>
      <div className="profil-badge">{user.type} {user.orientation}</div>

      <div className="profil-tabs">
        <div className="tab active">Profil</div>
        <div className="tab">Activité</div>
      </div>

      <div className="profil-completion-box">
        <h2>Devenez irrésistible, complétez votre profil !</h2>
        <p>Vous valoriserez ainsi davantage vos recherches tout en vous présentant sous votre meilleur jour.</p>
      </div>

      <div className="profil-infos">
        <div className="info-column">
          <p><strong>Âge :</strong> {user.age}</p>
          <p><strong>Silhouette :</strong> {user.silhouette}</p>
        </div>
        <div className="info-column">
          <p><strong>Localisation :</strong> {user.localisation}</p>
          <p><strong>Origines :</strong> {user.origines}</p>
          <p><strong>Taille :</strong> {user.taille}</p>
        </div>
      </div>

      <div className="profil-section">
        <PreferencesSummary />
      </div>

      <div className="profil-section">
        <ProfilDetailsSummary />
      </div>

      <div className="profil-section">
        <DescriptionCard />
      </div>

      <div className="profil-section">
        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}
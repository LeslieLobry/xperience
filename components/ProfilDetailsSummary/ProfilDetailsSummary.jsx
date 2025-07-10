"use client";
import { useState, useEffect } from "react";
import Modal from "../Modal/Modal";
import ProfilDetailsForm from "../ProfilDetailsForm/ProfilDetailsForm";
import Button from "../Button/Button";

export default function ProfilDetailsSummary({ editable = false, user = null }) {
  const [profil, setProfil] = useState(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  // Charge le profil depuis l'API si non fourni en props
  useEffect(() => {
    if (!user) {
      fetch("/api/me", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setProfil(data.user));
    } else {
      setProfil(user);
    }
  }, [user]);

  // Callback appelé APRES édition
  const handleProfilUpdate = (updatedUser) => {
    setProfil(updatedUser);
    setIsModalOpen(false);
    setConfirmation("Profil mis à jour ✅");
    setTimeout(() => setConfirmation(""), 3000);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  if (!profil) return null;

  return (
    <div className="preference-sum-contenant">
      <h3>Profil</h3>
      <div className="pref-details">
        <p className="pref-nom">Ville :</p>
        <p className="pref-rep">{profil.localisation || "..."}</p>
      </div>
      <div className="pref-details">
        <p className="pref-nom">Expérience :</p>
        <p className="pref-rep">{profil.experience || "..."}</p>
      </div>
      <div className="pref-details">
        <p className="pref-nom">Type de recherche :</p>
        <p className="pref-rep">{profil.rechercheType || "..."}</p>
      </div>
      <div className="pref-details">
        <p className="pref-nom">Type :</p>
        <p className="pref-rep">{profil.type || "..."}</p>
      </div>
      <div className="membre-colum">
        
        <div className="membre-1">
           {profil.type?.toLowerCase() === "couple" && <h3>Membre 1</h3>}
          <div className="pref-details">
            <p className="pref-nom">Âge :</p>
            <p className="pref-rep">{profil.age ? `${profil.age} ans` : "..."}</p>
          </div>
          <div className="pref-details">
            <p className="pref-nom">Fume :</p>
            <p className="pref-rep">{profil.fumeur || "..."}</p>
          </div>
          <div className="pref-details">
            <p className="pref-nom">Silhouette :</p>
            <p className="pref-rep">{profil.silhouette || "..."}</p>
          </div>
          <div className="pref-details">
            <p className="pref-nom">Taille :</p>
            <p className="pref-rep">{profil.taille || "..."}</p>
          </div>
          <div className="pref-details">
            <p className="pref-nom">Origines :</p>
            <p className="pref-rep">{profil.origines || "..."}</p>
          </div>
          <div className="pref-details">
            <p className="pref-nom">Yeux :</p>
            <p className="pref-rep">{profil.yeux || "..."}</p>
          </div>
          <div className="pref-details">
            <p className="pref-nom">Cheveux :</p>
            <p className="pref-rep">{profil.cheveux || "..."}</p>
          </div>
        </div>
        {profil.type?.toLowerCase() === "couple" && (
          <div className="membre-2">
            <h3>Membre 2</h3>
            <div className="pref-details">
              <p className="pref-nom">Âge :</p>
              <p className="pref-rep">{profil.age2 ? `${profil.age2} ans` : "..."}</p>
            </div>
            <div className="pref-details">
              <p className="pref-nom">Fume :</p>
              <p className="pref-rep">{profil.fumeur2 || "..."}</p>
            </div>
            <div className="pref-details">
              <p className="pref-nom">Silhouette :</p>
              <p className="pref-rep">{profil.silhouette2 || "..."}</p>
            </div>
            <div className="pref-details">
              <p className="pref-nom">Taille :</p>
              <p className="pref-rep">{profil.taille2 || "..."}</p>
            </div>
            <div className="pref-details">
              <p className="pref-nom">Origines :</p>
              <p className="pref-rep">{profil.origines2 || "..."}</p>
            </div>
            <div className="pref-details">
              <p className="pref-nom">Yeux :</p>
              <p className="pref-rep">{profil.yeux2 || "..."}</p>
            </div>
            <div className="pref-details">
              <p className="pref-nom">Cheveux :</p>
              <p className="pref-rep">{profil.cheveux2 || "..."}</p>
            </div>
          </div>
        )}
      </div>
      {editable && (
        <>
          <Button onClick={() => setIsModalOpen(true)} title="Modifier" color="#8c6a5d" />
          {confirmation && <p>{confirmation}</p>}
          <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
            <ProfilDetailsForm
              profil={profil}
              onUpdate={handleProfilUpdate}
              onClose={handleCloseModal}
            />
          </Modal>
        </>
      )}
    </div>
  );
}

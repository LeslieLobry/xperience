"use client";

import { useState, useEffect } from "react";
import Modal from "../Modal/Modal";
import ProfilDetailsForm from "../ProfilDetailsForm/ProfilDetailsForm";
import Button from "../Button/Button";

export default function ProfilDetailsSummary({ editable = false, user = null }) {
  const [profil, setProfil] = useState(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!user) {
      async function fetchProfil() {
        const res = await fetch("/api/me", { credentials: "include" });
        const data = await res.json();
        if (res.ok) {
          setProfil(data.user);
        }
      }
      fetchProfil();
    }
  }, [refreshKey, user]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRefreshKey((prev) => prev + 1);
    setConfirmation("Profil mis à jour ✅");
    setTimeout(() => setConfirmation(""), 3000);
  };

  if (!profil) return null;

  return (
    <div className="preference-sum-contenant">
      <h2>Profil</h2>

      <div className="pref-details">
        <p className="pref-nom">Ville :</p>
        <p className="pref-rep">{profil.localisation || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Expérience :</p>
        <p className="pref-rep">{profil.experience || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Type de recherche :</p>
        <p className="pref-rep">{profil.rechercheType || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Type :</p>
        <p className="pref-rep">{profil.type || "Non défini"}</p>
      </div>

      <h3>Informations personnelles</h3>

      <div className="pref-details">
        <p className="pref-nom">Âge :</p>
        <p className="pref-rep">
          {profil.age ? `${profil.age} ans` : "Non défini"}
        </p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Fume :</p>
        <p className="pref-rep">{profil.fumeur || "Non défini"}</p>
      </div>

      <h3>Description physique</h3>

      <div className="pref-details">
        <p className="pref-nom">Silhouette :</p>
        <p className="pref-rep">{profil.silhouette || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Taille :</p>
        <p className="pref-rep">{profil.taille || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Origines :</p>
        <p className="pref-rep">{profil.origines || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Yeux :</p>
        <p className="pref-rep">{profil.yeux || "Non défini"}</p>
      </div>

      <div className="pref-details">
        <p className="pref-nom">Cheveux :</p>
        <p className="pref-rep">{profil.cheveux || "Non défini"}</p>
      </div>

      {profil.type === "couple" && (
        <>
          <h3>Informations du/de la partenaire</h3>

          <div className="pref-details">
            <p className="pref-nom">Âge :</p>
            <p className="pref-rep">
              {profil.age2 ? `${profil.age2} ans` : "Non défini"}
            </p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Fume :</p>
            <p className="pref-rep">{profil.fumeur2 || "Non défini"}</p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Silhouette :</p>
            <p className="pref-rep">{profil.silhouette2 || "Non défini"}</p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Taille :</p>
            <p className="pref-rep">{profil.taille2 || "Non défini"}</p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Origines :</p>
            <p className="pref-rep">{profil.origines2 || "Non défini"}</p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Yeux :</p>
            <p className="pref-rep">{profil.yeux2 || "Non défini"}</p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Cheveux :</p>
            <p className="pref-rep">{profil.cheveux2 || "Non défini"}</p>
          </div>

          <div className="pref-details">
            <p className="pref-nom">Description :</p>
            <p className="pref-rep">{profil.description2 || "Non définie"}</p>
          </div>
        </>
      )}

      {editable && (
        <>
          <Button onClick={() => setIsModalOpen(true)} title="Modifier" color="#8c6a5d" />
          {confirmation && <p>{confirmation}</p>}
          <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
            <ProfilDetailsForm onClose={handleCloseModal} />
          </Modal>
        </>
      )}
    </div>
  );
}

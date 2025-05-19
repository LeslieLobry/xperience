"use client";

import { useState, useEffect } from "react";
import Modal from "../Modal/Modal";
import ProfilDetailsForm from "../ProfilDetailsForm/ProfilDetailsForm";

export default function ProfilDetailsSummary({ editable = false }) {
  const [profil, setProfil] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    async function fetchProfil() {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setProfil(data.user);
      }
    }
    fetchProfil();
  }, [refreshKey]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRefreshKey((prev) => prev + 1);
    setConfirmation("Profil mis à jour ✅");
    setTimeout(() => setConfirmation(""), 3000);
  };

  if (!profil) return null;

  return (
    <div>
      <h2>Profil</h2>
      <p><strong>Ville :</strong> {profil.localisation || "Non défini"}</p>
      <p><strong>Expérience :</strong> {profil.experience || "Non défini"}</p>
      <p><strong>Type de recherche :</strong> {profil.rechercheType || "Non défini"}</p>
      <p><strong>Sexe :</strong> {profil.sexe || "Non défini"}</p>

      <h3>Informations personnelles</h3>
      <p><strong>Âge :</strong> {profil.age ? `${profil.age} ans` : "Non défini"}</p>
      <p><strong>Fume :</strong> {profil.fumeur || "Non défini"}</p>

      <h3>Description physique</h3>
      <p><strong>Silhouette :</strong> {profil.silhouette || "Non défini"}</p>
      <p><strong>Taille :</strong> {profil.taille || "Non défini"}</p>
      <p><strong>Origines :</strong> {profil.origines || "Non défini"}</p>
      <p><strong>Yeux :</strong> {profil.yeux || "Non défini"}</p>
      <p><strong>Cheveux :</strong> {profil.cheveux || "Non défini"}</p>

      {editable && (
        <>
          <button onClick={() => setIsModalOpen(true)}>Modifier</button>
          {confirmation && <p>{confirmation}</p>}
          <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
            <ProfilDetailsForm onClose={handleCloseModal} />
          </Modal>
        </>
      )}
    </div>
  );
}

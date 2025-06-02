"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/Button/Button";
import "./id.css";

export default function PageEvenement() {
  const { id } = useParams();
  const router = useRouter();
  const [evenement, setEvenement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Protection : rediriger si pas connecté
  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.push("/connexion");
  }, [user, router]);

  // Détection admin
  useEffect(() => {
    if (user?.role === "ADMIN") setIsAdmin(true);
    else setIsAdmin(false);
  }, [user]);

  useEffect(() => {
    const fetchEvenement = async () => {
      try {
        const res = await fetch(`/api/evenements/${id}`);
        if (!res.ok) throw new Error("Erreur lors de la récupération");
        const data = await res.json();
        setEvenement({
          ...data,
          participants: data.participants || [],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEvenement();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!evenement) return <div>Événement introuvable.</div>;

  const dejaInscrit = evenement.participants?.some((p) => p.id === user?.id);

  const participer = async () => {
    if (dejaInscrit) return;
    const res = await fetch(`/api/evenements/${id}`, {
      method: "POST",
    });

    if (res.ok) {
      setEvenement((prev) => ({
        ...prev,
        participants: [...prev.participants, { id: user.id, pseudo: user.pseudo }],
      }));
      setConfirmation("✅ Vous êtes inscrit(e) à cet événement !");
    } else {
      setConfirmation("❌ Une erreur est survenue.");
    }
    setTimeout(() => setConfirmation(""), 5000);
  };

  const seDesinscrire = async () => {
    const res = await fetch(`/api/evenements/${id}`, {
      method: "DELETE",
      headers: { "x-action": "leave" },
    });

    if (res.ok) {
      setEvenement((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== user.id),
      }));
      setConfirmation("❌ Vous vous êtes désinscrit(e) de cet événement.");
    } else {
      setConfirmation("⚠️ Erreur lors de la désinscription.");
    }
    setTimeout(() => setConfirmation(""), 5000);
  };

  const supprimerEvenement = async () => {
    if (!window.confirm("Supprimer définitivement cet événement ?")) return;
    const res = await fetch(`/api/evenements/${evenement.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/evenements");
    } else {
      setConfirmation("❌ Erreur lors de la suppression.");
      setTimeout(() => setConfirmation(""), 5000);
    }
  };

  return (
    <div className="evenement-container">
      <Button
        title="← Retour"
        onClick={() => router.push("/evenements")}
        color="#e0c084"
        className="filtre-btn"
        style={{ marginBottom: "1rem" }}
      />

      <h1>{evenement.titre}</h1>

      {evenement.imageUrl && (
        <img src={evenement.imageUrl} alt="Affiche de l'événement" />
      )}

      <p>
        <strong>Date :</strong>{" "}
        {new Date(evenement.date).toISOString().split("T")[0]}
      </p>
      <p>
        <strong>Heure :</strong> {evenement.heureDebut} - {evenement.heureFin}
      </p>
      <p>
        <strong>Lieu :</strong> {evenement.lieu}
      </p>
      <p>
        <strong>Type :</strong> {evenement.type}
      </p>
      <p>
        <strong>Accès :</strong> {evenement.acces}
      </p>

      {evenement.lien && (
        <p>
          <strong>Lien :</strong>{" "}
          <a
            href={evenement.lien.startsWith("http") ? evenement.lien : `https://${evenement.lien}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {evenement.lien}
          </a>
        </p>
      )}

      <h2>Description</h2>
      <p>{evenement.description}</p>

      <h2>Tarifs</h2>
      <ul>
        <li>Couples : {evenement.tarifCouple ?? "?"} €</li>
        <li>Femmes : {evenement.tarifFemme ?? "?"} €</li>
        <li>Hommes : {evenement.tarifHomme ?? "?"} €</li>
      </ul>

      <h2>Participants ({evenement.participants?.length || 0})</h2>
      <ul>
        {evenement.participants.map((p) => (
          <li key={`${p.id}-${p.pseudo}`}>{p.pseudo}</li>
        ))}
      </ul>

      {confirmation && <p className="confirmation-message">{confirmation}</p>}

      {user && (
        <Button
          title={dejaInscrit ? "Se désinscrire" : "Participer"}
          onClick={dejaInscrit ? seDesinscrire : participer}
          color={dejaInscrit ? "#e57c73" : "#e0c084"}
          className="filtre-btn"
          style={{ marginTop: "1rem" }}
        />
      )}

      {/* Boutons admin visibles seulement pour l’admin */}
      {isAdmin && (
        <div className="admin-actions" style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <Button
            title="✏️ Modifier"
            onClick={() => router.push(`/evenements/editer/${evenement.id}`)}
            color="#7cbbe5"
            className="filtre-btn"
          />
          <Button
            title="🗑️ Supprimer"
            onClick={supprimerEvenement}
            color="#e57c73"
            className="filtre-btn"
          />
        </div>
      )}
    </div>
  );
}

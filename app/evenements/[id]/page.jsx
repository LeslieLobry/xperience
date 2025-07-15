"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/Button/Button"; // ajoute l'import si besoin
import "./id.css";
import { color } from "framer-motion";

export default function PageEvenement() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [evenement, setEvenement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const isAdmin = user?.role === "ADMIN";

  // Redirige si pas connecté
  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.push("/connexion");
  }, [user, router]);

  // Récupération de l'événement
  useEffect(() => {
    if (!id) return;
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
        setEvenement(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEvenement();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!evenement) return <div>Événement introuvable.</div>;

  const dejaInscrit = evenement.participants?.some((p) => p.id === user?.id);

  const participer = async () => {
    if (dejaInscrit) return;
    const res = await fetch(`/api/evenements/${id}`, { method: "POST" });
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

  // ⚡️ Gestion multi-dates
  const datesAffichees = Array.isArray(evenement.dates)
  ? evenement.dates.map((d) =>
      new Date(d).toLocaleDateString("fr-FR")
    )
  : [];


  return (
    <div className="evenement-container">
      <button
        title="← Retour"
        onClick={() => router.push("/evenements")}
        color="#e0c084"
        className="retour"
      >Retour</button>
      <div className="event-grid">
  <div className="img-title">
      <h1 className="titre-event">{evenement.titre}</h1>

      {evenement.imageUrl && (
        <img
          src={evenement.imageUrl}
          alt="Affiche de l'événement"
          className="evenement-image"
        />
      )}
      </div>
      <div className="description-contenant">
      <h2>Description</h2>
      <p>{evenement.description}</p>
</div>
</div>
<div className="event-details-description">
      <div className="evenement-details">
        <h2 className="event-details-title">Infos</h2>
        <p>
          <strong>Date{datesAffichees.length > 1 ? "s" : ""} :</strong>{" "}
          {datesAffichees.length
            ? datesAffichees.join(", ")
            : "?"}
        </p>
        <p>
          {/* <strong>Heure :</strong> {evenement.heureDebut} - {evenement.heureFin} */}
        </p>
        <p>
          <strong>Lieu :</strong> {evenement.lieu}
        </p>
        {/* <p>
          <strong>Type :</strong> {evenement.type}
        </p> */}
        {/* <p>
          <strong>Accès :</strong> {evenement.acces}
        </p> */}

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
      </div>

</div>
      {/* <h2>Tarifs</h2>
      <ul>
        <li>Couples : {evenement.tarifCouple ?? "?"} €</li>
        <li>Femmes : {evenement.tarifFemme ?? "?"} €</li>
        <li>Hommes : {evenement.tarifHomme ?? "?"} €</li>
      </ul> */}

      <h2>Participants ({evenement.participants?.length || 0})</h2>
      <ul>
        {evenement.participants.map((p) => (
          <li key={`${p.id}-${p.pseudo}`}>{p.pseudo}</li>
        ))}
      </ul>

      {confirmation && <p className="confirmation-message">{confirmation}</p>}

      {user && (
     <button
  onClick={dejaInscrit ? seDesinscrire : participer}
  className="retour"
    title={dejaInscrit ? "Se désinscrire" : "Participer"} // ← ça c'est l'infobulle au survol, tu peux garder si tu veux
>
  {dejaInscrit ? "Se désinscrire" : "Participer"}
</button>

      )}

      {isAdmin && (
        <div className="admin-actions" style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <Button
            title="✏️ Modifier"
            onClick={() => router.push(`/evenements/modifier/${evenement.id}`)}
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

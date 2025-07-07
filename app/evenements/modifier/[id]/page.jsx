"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import FormEvenement from "../../../../components/FormEvenement/FormEvenement";

export default function ModifierEvenementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();

  const [evenement, setEvenement] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Protection anti non-admin
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.push("/evenements");
    }
  }, [user, router]);

  // Récupération de l’événement à modifier
  useEffect(() => {
    if (!params.id) return;
    const fetchEvent = async () => {
      const res = await fetch(`/api/evenements/${params.id}`);
      if (res.ok) {
        const event = await res.json();
        setEvenement({
          ...event,
          // On transforme le tableau de dates pour le <input type="date" /> (format YYYY-MM-DD)
          dates: Array.isArray(event.dates)
            ? event.dates.map((d) => d.split("T")[0])
            : [],
        });
      } else {
        setError("Événement introuvable.");
      }
    };
    fetchEvent();
  }, [params.id]);

  // Handler pour la soumission du formulaire
  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError("");

    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (k === "imageFile" && v) {
        fd.append("image", v);
      } else if (k === "dates" && Array.isArray(v)) {
        // Plusieurs dates : envoie chaque date individuellement
        v.forEach((dateStr) => fd.append("dates[]", dateStr));
      } else if (k !== "imageFile") {
        fd.append(k, v);
      }
    });

    // Appelle bien la route d'update (PUT sur /api/evenements/[id])
    const res = await fetch(`/api/evenements/${params.id}`, {
      method: "PUT",
      body: fd,
    });

    if (res.ok) {
      router.push("/evenements");
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la modification");
    }
    setIsSubmitting(false);
  };

  if (error) return <div>{error}</div>;
  if (!evenement) return <div>Chargement...</div>;

  return (
    <FormEvenement
      initialValues={evenement}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
      titre="Modifier un événement"
    />
  );
}

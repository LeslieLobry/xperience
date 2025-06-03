"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import FormEvenement from "../../../components/FormEvenement/FormEvenement";
import "./creer.css";

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Protection anti non-admin
  if (user && user.role !== "ADMIN") {
    if (typeof window !== "undefined") router.push("/evenements");
    return null;
  }

  // Handler submit pour FormEvenement
  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError("");
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (k === "imageFile" && v) data.append("image", v);
      else if (k !== "imageFile") data.append(k, v);
    });

    try {
      const res = await fetch("/api/evenements", { method: "POST", body: data });
      if (res.ok) {
        router.push("/evenements");
      } else {
        let err = "Erreur lors de la création";
        try {
          const data = await res.json();
          err = data.error || err;
        } catch {}
        setError(err);
      }
    } catch {
      setError("Erreur réseau");
    }
    setIsSubmitting(false);
  };

  return (
    <FormEvenement
      initialValues={{}}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
      titre="Créer un événement"
    />
  );
}

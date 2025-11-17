"use client";
import { useState } from "react";
import "./NewsletterForm.css";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const inscrire = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/newsletter/abonner", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.success) setMessage("Merci pour votre inscription !");
    else setMessage("Erreur ou déjà inscrit.");
  };

  return (
    <form onSubmit={inscrire} className="newsletter-form">
      <h2 className="newsletter-title">📬 Abonnez-vous à notre newsletter</h2>
      <input
        type="email"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">S’abonner</button>
      {message && <p>{message}</p>}
    </form>
  );
}

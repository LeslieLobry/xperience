"use client";
import { useState } from "react";
import "./contact.css";

export default function ContactPage() {
  const [form, setForm] = useState({ nom: "", email: "", message: "" });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Votre message a bien été envoyé !");
        setForm({ nom: "", email: "", message: "" });
      } else {
        setError(data.error || "Une erreur est survenue.");
      }
    } catch {
      setError("Erreur de connexion.");
    }
  };

  return (
    <div className="contact-page">
      <h1>📬 Contactez-nous</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nom"
          placeholder="Votre nom"
          value={form.nom}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Votre email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <textarea
          name="message"
          placeholder="Votre message"
          value={form.message}
          onChange={handleChange}
          required
        ></textarea>
        <button type="submit">Envoyer</button>

        {success && <p className="success">{success}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function ConnexionPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.success) {
      setSuccess("Connexion réussie !");
      // Rediriger vers le dashboard plus tard
    } else {
      setError(data.message);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 400, margin: "auto" }}>
      <h1>Connexion</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: "1rem" }}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: "1rem" }}
          required
        />
        <button type="submit" style={{ width: "100%" }}>
          Se connecter
        </button>
      </form>
    </div>
  );
}

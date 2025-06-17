"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button/Button";
import "../connexion/connexion.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConnexionPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace("/accueil-page");
    }
  }, [user]);

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
    // ✅ Pas besoin de fetchUser : le serveur s’en chargera via le cookie HttpOnly
    router.push("/accueil-page");
  } else {
    setError(data.message);
  }
};

  return (
    <div className="connexion-contenant">
      <h1 className="connexion-title">Connexion</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <form onSubmit={handleSubmit} className="form-connexion">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="form-input"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={handleChange}
          className="form-input"
          required
        />
        <Button
          type="submit"
          title="Se connecter"
          color="var(--primary-color)"
        />
      </form>

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link href="/mot-de-passe-oublie" className="forgot-link">
          Mot de passe oublié ?
        </Link>
      </div>
    </div>
  );
}

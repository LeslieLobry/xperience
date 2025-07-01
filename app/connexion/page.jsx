'use client';

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
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const { user, setUser } = useAuth(); // Assure-toi que ton contexte expose setUser

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
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("Connexion réussie !");
        // Mets à jour le contexte utilisateur avec les données reçues si possible
        // Par exemple : setUser(data.user);
        // Sinon, tu peux faire fetchUser() mais ça ralentit un peu

        router.replace("/accueil-page"); // redirige vite sans garder l’historique
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Erreur serveur, veuillez réessayer.");
      console.error(err);
    } finally {
      setLoading(false);
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
          disabled={loading}
        />
        <div className="input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            className="form-input"
            required
            disabled={loading}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={loading}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <Button
          type="submit"
          title={loading ? "Connexion en cours..." : "Se connecter"}
          color="var(--primary-color)"
          disabled={loading}
        />
      </form>

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link href="/mot-de-passe-oublie" className="forgot-link" prefetch={true}>
          Mot de passe oublié ?
        </Link>
      </div>
    </div>
  );
}

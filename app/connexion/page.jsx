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
  // Précharge les données accueil
 const initRes = await fetch("/api/init", {
  credentials: "include",
});
  const initData = await initRes.json();

  if (initData.success) {
    setUser(initData.utilisateur); // met à jour le contexte
    // Tu peux stocker initData.conversations, notifications, etc. aussi si besoin
  }

  setSuccess("Connexion réussie !");
  router.replace("/accueil-page");
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
      className="input-email"
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
            {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#e0c084" className="bi bi-eye-slash-fill" viewBox="0 0 16 16">
  <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/>
  <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
</svg> :<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="24" height="24" viewBox="0 0 1280.000000 662.000000" preserveAspectRatio="xMidYMid meet" color="white">
<metadata>
Created by potrace 1.15, written by Peter Selinger 2001-2017
</metadata>
<g transform="translate(0.000000,662.000000) scale(0.100000,-0.100000)" fill="#e0c084"  stroke="none">
<path d="M6330 6609 c-1718 -102 -3518 -884 -5200 -2260 -336 -274 -685 -593 -956 -873 l-173 -178 91 -99 c144 -156 523 -517 803 -764 1394 -1232 2845 -2012 4275 -2299 486 -97 816 -130 1320 -130 383 -1 517 7 845 49 1372 176 2726 781 3982 1781 517 411 1037 915 1406 1362 l78 93 -27 32 c-463 555 -984 1081 -1491 1504 -1537 1283 -3211 1885 -4953 1782z m464 -584 c362 -42 679 -139 1002 -304 957 -491 1538 -1464 1501 -2511 -22 -585 -223 -1125 -593 -1590 -87 -109 -314 -336 -424 -424 -403 -322 -876 -525 -1410 -607 -214 -33 -590 -33 -810 0 -560 83 -1055 305 -1470 656 -119 101 -310 302 -403 423 -298 389 -481 840 -542 1332 -30 243 -15 583 35 831 237 1162 1221 2047 2440 2193 160 19 514 20 674 1z"/>
<path d="M6325 4819 c-557 -58 -1040 -395 -1274 -889 -180 -380 -196 -802 -47 -1188 166 -430 522 -771 959 -917 203 -68 276 -79 527 -79 212 0 232 1 345 28 147 34 230 64 360 126 437 210 750 611 852 1090 28 130 25 469 -4 600 -58 259 -165 475 -334 677 -331 394 -863 606 -1384 552z"/>
</g>
</svg>}
          </button>
        </div>

        <Button
          type="submit"
          title={loading ? "Connexion en cours..." : "Se connecter"}
          color="var(--primary-color)"
          disabled={loading}
          className="button-blanc"
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

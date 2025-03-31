"use client";

import React, { useState } from 'react';
import "@/app/inscription/inscription.css"

export default function RegisterForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    pseudo: "",
    type: "",
    orientation: "",
    recherche: [],
    localisation: "",
    age: "",
    consent: false,
  });

  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name === "consent") {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleRechercheChange = (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const recherche = prev.recherche.includes(value)
        ? prev.recherche.filter((v) => v !== value)
        : [...prev.recherche, value];
      return { ...prev, recherche };
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
  };

  const isPasswordStrong = (password) => {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password) // caractère spécial
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      return setError("Les mots de passe ne correspondent pas.");
    }

    if (!isPasswordStrong(form.password)) {
      return setError("Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
    }

    if (!form.consent) {
      return setError("Vous devez accepter les conditions.");
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(`${key}[]`, v));
      } else {
        formData.append(key, value);
      }
    });

    if (photo) {
      formData.append("photo", photo);
    }

    console.log("Formulaire prêt à être envoyé (FormData)");
    setSuccess("Formulaire prêt, tu peux connecter l'API !");
  };

  return (
      <div className="register-contenant">

      <h2 className="form-title">Inscription</h2>
        <form onSubmit={handleSubmit} className="form-container">
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <input type="text" name="pseudo" placeholder="Pseudo" onChange={handleChange} required className="form-input" />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="form-input" />
      <input type="password" name="password" placeholder="Mot de passe" onChange={handleChange} required className="form-input" />
      <input type="password" name="confirmPassword" placeholder="Confirmer mot de passe" onChange={handleChange} required className="form-input" />

      <select name="type" onChange={handleChange} required className="form-input">
        <option value="">Type de compte</option>
        <option value="homme">Homme seul</option>
        <option value="femme">Femme seule</option>
        <option value="couple">Couple</option>
        <option value="autre">Autre</option>
      </select>

      <select name="orientation" onChange={handleChange} required className="form-input">
        <option value="">Orientation</option>
        <option value="hetero">Hétéro</option>
        <option value="bi">Bi</option>
        <option value="pan">Pan</option>
        <option value="ouvert">Ouvert</option>
      </select>

      <div className="form-group">
        <label>Ce que vous recherchez :</label><br />
        {["tchat", "rencontre", "échangisme", "trio", "soirées privées"].map((option) => (
          <label key={option} className="form-checkbox">
            <input
              type="checkbox"
              value={option}
              checked={form.recherche.includes(option)}
              onChange={handleRechercheChange}
            />
            {option}
          </label>
        ))}
      </div>

      <input type="text" name="localisation" placeholder="Ville / région" onChange={handleChange} className="form-input" />
      <input type="number" name="age" placeholder="Âge" onChange={handleChange} required className="form-input" />

      <div className="form-group">
        <label>Photo de profil :</label><br />
        <input type="file" accept="image/*" onChange={handlePhotoChange} className="form-input" />
      </div>

      <label className="form-checkbox">
        <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} />
        J’accepte les CGU et j’ai plus de 18 ans.
      </label>

      <button type="submit" className="form-button">Créer mon compte</button>
    </form>
      </div>
  );
}

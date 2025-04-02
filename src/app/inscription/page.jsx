"use client";
import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import Button from "@/components/Button/Button";
import "@/app/inscription/inscription.css";

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [captchaToken, setCaptchaToken] = useState(null);
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
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

  const isPasswordStrong = (password) =>
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const validateStep = () => {
    if (step === 1) {
      if (!form.pseudo || !form.email || !form.password || !form.confirmPassword) {
        setError("Merci de remplir tous les champs requis à cette étape.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return false;
      }
      if (!isPasswordStrong(form.password)) {
        setError("Le mot de passe n'est pas assez sécurisé.");
        return false;
      }
    }

    if (step === 2) {
      if (!form.type || !form.orientation || form.recherche.length === 0) {
        setError("Merci de sélectionner un type, une orientation et au moins une recherche.");
        return false;
      }
    }

    if (step === 3) {
      if (!form.age || !form.consent) {
        setError("Merci de compléter tous les champs requis.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!captchaToken) return setError("Merci de valider le reCAPTCHA.");
    if (!validateStep()) return;

    try {
      const captchaRes = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaToken }),
      });
      const captchaData = await captchaRes.json();
      if (!captchaData.success)
        return setError("Vérification reCAPTCHA échouée. Veuillez réessayer.");
    } catch (err) {
      console.error("Erreur reCAPTCHA :", err);
      return setError("Erreur serveur pendant la vérification reCAPTCHA.");
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(`${key}[]`, v));
      } else {
        formData.append(key, value);
      }
    });
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (result.success) setSuccess("Inscription réussie !");
      else setError(result.message || "Erreur lors de l'inscription.");
    } catch (err) {
      console.error("Erreur lors de l'envoi du formulaire :", err);
      setError("Erreur serveur pendant l'enregistrement.");
    }
  };

  return (
    <div className="register-contenant">
      <div className="register-background">
        <h2 className="form-title">Inscription</h2>
        <p className="form-step">Étape {step} / 3</p>
        <form onSubmit={handleSubmit} className="form-container">
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          {step === 1 && (
            <>
              <input type="text" name="pseudo" placeholder="Pseudo" onChange={handleChange} required className="form-input" />
              <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="form-input" />
              <input type="password" name="password" placeholder="Mot de passe" onChange={handleChange} required className="form-input" />
              <input type="password" name="confirmPassword" placeholder="Confirmer mot de passe" onChange={handleChange} required className="form-input" />
              <div className="form-buttons">
                <Button
                  title="Suivant"
                  onClick={() => validateStep() && nextStep()}
                  color="var(--primary-color)"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
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
                    <input type="checkbox" value={option} checked={form.recherche.includes(option)} onChange={handleRechercheChange} />
                    {option}
                  </label>
                ))}
              </div>
              <div className="form-buttons">
                <Button title="Retour" onClick={prevStep} color="#888" />
                <Button title="Suivant" onClick={() => validateStep() && nextStep()} color="#0070f3" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
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
              <ReCAPTCHA sitekey="6LdGPAcrAAAAAAwtoUNaMatRyS2ZXYsYY09G0YQA" onChange={(token) => setCaptchaToken(token)} />
              <div className="form-buttons">
                <Button title="Retour" onClick={prevStep} color="#888" />
                <Button title="Créer mon compte" type="submit" color="#28a745" />
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

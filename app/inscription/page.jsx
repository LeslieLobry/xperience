"use client";
import React, { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import Button from "../../components/Button/Button";
import "../inscription/inscription.css";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { getCoordsFromVille } from "../../lib/getCoordsFromVille"; // adapte le chemin si besoin


export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
    pseudo: "",
    type: "",
    orientation: "",
    sexe: "",
    recherche: [],
    localisation: "",
    age: "",
    consent: false,
  });

  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [localisationInput, setLocalisationInput] = useState("");
  const debounceTimeout = useRef(null);
  const router = useRouter();

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

  const isValidName = (name) => /^[A-Za-zÀ-ÿ' -]{2,}$/.test(name);

  const validateStep = () => {
    if (step === 1) {
      const { nom, prenom, pseudo, email, password, confirmPassword } = form;
      if (!nom || !prenom || !pseudo || !email || !password || !confirmPassword)
        return setError("Merci de remplir tous les champs requis."), false;
      if (!isValidName(nom) || !isValidName(prenom))
        return setError("Le nom et le prénom doivent contenir uniquement des lettres."), false;
      if (password !== confirmPassword)
        return setError("Les mots de passe ne correspondent pas."), false;
      if (!isPasswordStrong(password))
        return setError("Le mot de passe n'est pas assez sécurisé."), false;
    }

    if (step === 2) {
      if (!form.type || !form.orientation)
        return setError("Merci de sélectionner un type et une orientation."), false;
    }

    if (step === 3) {
      if (!form.age || !form.consent || !form.localisation)
        return setError("Merci de compléter tous les champs requis."), false;
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
      setLoading(true);
      const formData = new FormData();

      const coords = await getCoordsFromVille(form.localisation);

Object.entries({
  ...form,
  latitude: coords.latitude,
  longitude: coords.longitude,
}).forEach(([key, value]) => {
  if (Array.isArray(value)) {
    value.forEach((v) => formData.append(`${key}[]`, v));
  } else if (typeof value === "boolean") {
    formData.append(key, value ? "true" : "false");
  } else if (key === "age") {
    formData.append(key, parseInt(value, 10));
  } else {
    formData.append(key, value);
  }
});


      if (photo) formData.append("photo", photo);
      formData.append("captchaToken", captchaToken);

      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        setSuccess("Inscription réussie !");
        setShowModal(true);
      } else {
        setError(result.message || "Erreur lors de l'inscription.");
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi du formulaire :", err);
      setError("Erreur serveur pendant l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    router.push("/connexion");
  };

  const handleLocalisationChange = (e) => {
    const value = e.target.value;
    setLocalisationInput(value);
    setForm((prev) => ({ ...prev, localisation: value }));

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (value.length >= 2) {
      debounceTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(value)}&fields=nom&boost=population&limit=5`
          );
          const data = await res.json();
          const villes = data.map((v) => v.nom);
          setSuggestions(villes);
        } catch (err) {
          console.error("Erreur geo.api.gouv.fr :", err);
          setSuggestions([]);
        }
      }, 400);
    } else {
      setSuggestions([]);
    }
  };

  const handleVilleSelect = (ville) => {
    setForm((prev) => ({ ...prev, localisation: ville }));
    setLocalisationInput(ville);
    setSuggestions([]);
  };

  const typeLabel = (value) => {
    switch (value) {
      case "homme":
        return "Homme seul";
      case "femme":
        return "Femme seule";
      case "couple":
        return "Couple";
      case "autre":
        return "Autre";
      default:
        return "";
    }
  };

  const orientationLabel = (value) => {
    switch (value) {
      case "hetero":
        return "Hétéro";
      case "bi":
        return "Bi";
      case "pan":
        return "Pan";
      case "ouvert":
        return "Ouvert";
      default:
        return "";
    }
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "transparent",
      borderColor: "#ccc",
      color: "white",
      height: "3.5rem",
      fontSize: "1.6rem",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#222",
      color: "white",
      zIndex: 10,
    }),
    singleValue: (base) => ({ ...base, color: "white" }),
    placeholder: (base) => ({ ...base, color: "white", opacity: 0.7 }),
    input: (base) => ({ ...base, color: "white" }),
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
    <input
      type="text"
      name="nom"
      placeholder="Nom"
      onChange={handleChange}
      className="form-input"
    />
    <input
      type="text"
      name="prenom"
      placeholder="Prénom"
      onChange={handleChange}
      className="form-input"
    />
    <input
      type="text"
      name="pseudo"
      placeholder="Pseudo"
      onChange={handleChange}
      className="form-input"
    />
    <input
      type="email"
      name="email"
      placeholder="Email"
      onChange={handleChange}
      className="form-input"
    />

    <div className="input-wrapper">
      <input
        type={showPassword ? "text" : "password"}
        name="password"
        placeholder="Mot de passe"
        onChange={handleChange}
        className="form-input"
      />
      <button
        type="button"
        className="toggle-password"
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? "🙈" : "👁️"}
      </button>
    </div>

    <div className="input-wrapper">
      <input
        type={showConfirmPassword ? "text" : "password"}
        name="confirmPassword"
        placeholder="Confirmer mot de passe"
        onChange={handleChange}
        className="form-input"
      />
      <button
        type="button"
        className="toggle-password"
        onClick={() => setShowConfirmPassword((prev) => !prev)}
      >
        {showConfirmPassword ? "🙈" : "👁️"}
      </button>
    </div>

    <div className="form-buttons">
      <Button
        type="button"
        title="Suivant"
        onClick={() => validateStep() && nextStep()}
        color="var(--primary-color)"
      />
    </div>
  </>
)}


          {step === 2 && (
  <>
    <div style={{ width: "100%", maxWidth: "400px" }}>
      <Select
        options={[
          { value: "homme", label: "Homme seul" },
          { value: "femme", label: "Femme seule" },
          { value: "couple", label: "Couple" },
          { value: "autre", label: "Autre" },
        ]}
        placeholder="Type de compte"
        value={
          form.type
            ? { value: form.type, label: typeLabel(form.type) }
            : null
        }
        onChange={(e) => setForm((prev) => ({ ...prev, type: e.value }))}
        styles={customSelectStyles}
      />
    </div>

    <div style={{ width: "100%", maxWidth: "400px" }}>
      <Select
        options={[
          { value: "hetero", label: "Hétéro" },
          { value: "bi", label: "Bi" },
          { value: "pan", label: "Pan" },
          { value: "ouvert", label: "Ouvert" },
        ]}
        placeholder="Orientation"
        value={
          form.orientation
            ? { value: form.orientation, label: orientationLabel(form.orientation) }
            : null
        }
        onChange={(e) => setForm((prev) => ({ ...prev, orientation: e.value }))}
        styles={customSelectStyles}
      />
    </div>

    <div className="form-buttons">
      <Button type="button" title="Retour" onClick={prevStep} color="#a2b9c1" />
      <Button type="button" title="Suivant" onClick={() => validateStep() && nextStep()} color="#e0c084" />
    </div>
  </>
)}


          {step === 3 && (
            <>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  name="localisation"
                  placeholder="Ville"
                  value={localisationInput}
                  onChange={handleLocalisationChange}
                  className="form-input"
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((ville, i) => (
                      <li key={i} onClick={() => handleVilleSelect(ville)}>
                        {ville}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input type="number" name="age" placeholder="Âge" onChange={handleChange} className="form-input" />
              <div className="form-group">
                <label>Photo de profil :</label><br />
                <input type="file"name="photo" accept="image/*" onChange={handlePhotoChange} className="form-input" />
              </div>
              <label className="form-checkbox">
                <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} />
                J’accepte les CGU et j’ai plus de 18 ans.
              </label>
              <ReCAPTCHA  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}  onChange={setCaptchaToken}/>
              <div className="form-buttons">
                <Button type="button" title="Retour" onClick={prevStep} color="#888" />
                <Button title="Créer mon compte" type="submit" color="#e0c084" disabled={loading} />
              </div>
            </>
          )}
{showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>🎉 Inscription réussie !</h3>
                <p>Un email de confirmation vous a été envoyé.</p>
                <p>Merci de cliquer sur le lien pour activer votre compte.</p>
                <button onClick={handleModalConfirm} className="btn-modal">
                  OK
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

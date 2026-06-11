"use client";

import React, { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import Button from "../../components/Button/Button";
import "../inscription/inscription.css";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { getCoordsFromVille } from "../../lib/getCoordsFromVille";

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
    latitude: undefined,
    longitude: undefined,
    country: null,
    deptCode: null,
    region: null,
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
  const [villeSelectionnee, setVilleSelectionnee] = useState(false);

  const debounceTimeout = useRef(null);
  const router = useRouter();

  const handleLocalisationChange = (e) => {
    const value = e.target.value;

    setLocalisationInput(value);
    setVilleSelectionnee(false);

    setForm((prev) => ({
      ...prev,
      localisation: value,
      latitude: undefined,
      longitude: undefined,
      country: null,
      deptCode: null,
      region: null,
    }));

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (value.length >= 2) {
      debounceTimeout.current = setTimeout(async () => {
        try {
          const resFr = await fetch(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
              value
            )}&limit=5&boost=population&fields=nom,centre,departement,codeDepartement`
          );

          const dataFr = await resFr.json();

          if (Array.isArray(dataFr) && dataFr.length > 0) {
            setSuggestions(
              dataFr.map((v) => ({
                label: `${v.nom} (${v.codeDepartement})`,
                value: v.nom,
                city: v.nom,
                country: "France",
                region: v?.departement?.nom,
                deptCode: v?.codeDepartement || null,
                latitude: v?.centre?.coordinates?.[1],
                longitude: v?.centre?.coordinates?.[0],
              }))
            );
            return;
          }

          const res = await fetch(
            `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodeURIComponent(
              value
            )}&limit=5&sort=-population`,
            {
              headers: {
                "X-RapidAPI-Key": process.env.NEXT_PUBLIC_GEODB_API_KEY,
                "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
              },
            }
          );

          const data = await res.json();

          setSuggestions(
            (data?.data || []).map((v) => ({
              label: `${v.city}${
                v.region ? " (" + v.region + ")" : ""
              }, ${v.country}`,
              value: v.city,
              city: v.city,
              country: v.country,
              region: v.region,
              latitude: v.latitude,
              longitude: v.longitude,
            }))
          );
        } catch (err) {
          console.error("Erreur API localisation :", err);
          setSuggestions([]);
        }
      }, 400);
    } else {
      setSuggestions([]);
    }
  };

  const handleVilleSelect = (villeObj) => {
    const isFrance = villeObj.country === "France";

    const labelAffichee = isFrance
      ? `${villeObj.city}${villeObj.deptCode ? ` (${villeObj.deptCode})` : ""}`
      : villeObj.label;

    setForm((prev) => ({
      ...prev,
      localisation: labelAffichee,
      latitude: villeObj.latitude,
      longitude: villeObj.longitude,
      country: villeObj.country || null,
      deptCode: villeObj.deptCode || null,
      region: villeObj.region || null,
    }));

    setLocalisationInput(labelAffichee);
    setVilleSelectionnee(true);
    setSuggestions([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let newValue = type === "checkbox" ? checked : value;

    if (name === "email") {
      newValue = value.toLowerCase();
    }

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
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

  const isPseudoEmailLike = (pseudo) => {
    if (!pseudo) return false;
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    return emailRegex.test(pseudo);
  };

  const validateStep = () => {
    if (step === 1) {
      const { nom, prenom, pseudo, email, password, confirmPassword } = form;

      if (!nom || !prenom || !pseudo || !email || !password || !confirmPassword) {
        setError("Merci de remplir tous les champs requis.");
        return false;
      }

      if (!isValidName(nom) || !isValidName(prenom)) {
        setError("Le nom et le prénom doivent contenir uniquement des lettres.");
        return false;
      }

      if (isPseudoEmailLike(pseudo)) {
        setError("Votre pseudo ne peut pas contenir d'adresse email.");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return false;
      }

      if (!isPasswordStrong(password)) {
        setError(
          "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
        );
        return false;
      }
    }

    if (step === 2) {
      if (!form.type || !form.orientation) {
        setError("Merci de sélectionner un type et une orientation.");
        return false;
      }
    }

    if (step === 3) {
    if (!form.consent || !form.localisation || !photo) {
  setError("Merci de compléter tous les champs requis, photo comprise.");
  return false;
}

if (!villeSelectionnee || !form.latitude || !form.longitude) {
  setError("Merci de sélectionner une vraie ville dans la liste proposée.");
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

    if (!captchaToken) {
      setError("Merci de valider le reCAPTCHA.");
      return;
    }

    if (!validateStep()) return;

    try {
      setLoading(true);

      const formData = new FormData();

      let latitude = form.latitude;
      let longitude = form.longitude;

      if (!latitude || !longitude) {
        try {
          const coords = await getCoordsFromVille(form.localisation);
          latitude = coords.latitude;
          longitude = coords.longitude;
        } catch {
          setError("Ville invalide. Merci de sélectionner une ville dans la liste.");
          setLoading(false);
          return;
        }
      }

      const normalizedEmail = form.email ? form.email.toLowerCase().trim() : "";

      Object.entries({
        ...form,
        email: normalizedEmail,
        latitude,
        longitude,
      }).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(`${key}[]`, v));
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "true" : "false");
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
  container: (base) => ({
    ...base,
    width: "100%",
  }),

  control: (base) => ({
    ...base,
    width: "100%",
    minHeight: "54px",
    backgroundColor: "rgba(0,0,0,0.25)",
    border: "1px solid #e0c084",
    borderRadius: "10px",
    boxShadow: "none",
    cursor: "pointer",

    "&:hover": {
      borderColor: "#e0c084",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 1rem",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#f5ece0",
    fontSize: "1.3rem",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#e0c084",
    fontSize: "1.3rem",
  }),

  input: (base) => ({
    ...base,
    color: "#f5ece0",
    fontSize: "1.3rem",
  }),

menu: (base) => ({
  ...base,
  backgroundColor: "#171717",
  border: "1px solid #e0c084",
  borderRadius: "10px",
  overflow: "hidden",
  zIndex: 99999,
}),

menuPortal: (base) => ({
  ...base,
  zIndex: 99999,
}),

  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "rgba(224,192,132,0.20)"
      : "#171717",
    color: "#f5ece0",
    fontSize: "1.3rem",
    cursor: "pointer",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    color: "#e0c084",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),
};
  return (
    <div className="register-contenant">
      <div className="register-background">
        <h1 className="form-title">Inscription</h1>
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
                value={form.nom}
                onChange={handleChange}
                className="form-input"
              />

              <input
                type="text"
                name="prenom"
                placeholder="Prénom"
                value={form.prenom}
                onChange={handleChange}
                className="form-input"
              />

              <input
                type="text"
                name="pseudo"
                placeholder="Pseudo"
                value={form.pseudo}
                onChange={handleChange}
                className="form-input"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="form-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                inputMode="email"
              />

              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Mot de passe"
                  value={form.password}
                  onChange={handleChange}
                  className="form-input"
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  <span
                    className={`eye-icon ${
                      showPassword ? "eye-open" : "eye-closed"
                    }`}
                  />
                </button>
              </div>

              <p className="password-help">
                Le mot de passe doit contenir au moins 8 caractères, une
                majuscule, une minuscule, un chiffre et un caractère spécial.
              </p>

              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirmer mot de passe"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Masquer la confirmation de mot de passe"
                      : "Afficher la confirmation de mot de passe"
                  }
                >
                  <span
                    className={`eye-icon ${
                      showConfirmPassword ? "eye-open" : "eye-closed"
                    }`}
                  />
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
              <div className="select-wrapper">
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
  onChange={(e) =>
    setForm((prev) => ({ ...prev, type: e.value }))
  }
  styles={customSelectStyles}
  menuPortalTarget={document.body}
  menuPosition="fixed"
  menuPlacement="auto"
/>
              </div>

              <div className="select-wrapper">
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
      ? {
          value: form.orientation,
          label: orientationLabel(form.orientation),
        }
      : null
  }
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      orientation: e.value,
    }))
  }
  styles={customSelectStyles}
  menuPortalTarget={document.body}
  menuPosition="fixed"
  menuPlacement="auto"
/>
              </div>

              <div className="form-buttons">
                <Button
                  type="button"
                  title="Retour"
                  onClick={prevStep}
                  color="#a2b9c1"
                />

                <Button
                  type="button"
                  title="Suivant"
                  onClick={() => validateStep() && nextStep()}
                  color="#e0c084"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="ville-wrapper" style={{ position: "relative", width: "100%" }}>
                <input
                  type="text"
                  name="localisation"
                  placeholder="Ville"
                  value={localisationInput}
                  onChange={handleLocalisationChange}
                  className="form-input"
                  autoComplete="off"
                  style={{ width: "100%" }}
                />

                {suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((ville, i) => (
                      <li
                        key={i}
                        onClick={() => handleVilleSelect(ville)}
                        style={{ cursor: "pointer" }}
                      >
                        {ville.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label>
                  Photo de profil <span style={{ color: "#e57c73" }}>*</span> :
                </label>
                <br />

                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="form-input"
                />
              </div>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={handleChange}
                />
                J’accepte les CGU et j’ai plus de 18 ans.
              </label>

              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={setCaptchaToken}
              />

              <div className="form-buttons">
                <Button
                  type="button"
                  title="Retour"
                  onClick={prevStep}
                  color="#888"
                />

                <Button
                  title={loading ? "Création..." : "Créer mon compte"}
                  type="submit"
                  color="#e0c084"
                  disabled={loading}
                />
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
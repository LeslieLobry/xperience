"use client";
import React, { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import Button from "../../components/Button/Button";
import "../inscription/inscription.css";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { getCoordsFromVille } from "../../lib/getCoordsFromVille"; // Adapte si besoin

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

  // --- AUTOCOMPLETE VILLE MONDE ---
  const handleLocalisationChange = (e) => {
    const value = e.target.value;
    setLocalisationInput(value);
    setForm((prev) => ({ ...prev, localisation: value }));

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (value.length >= 2) {
      debounceTimeout.current = setTimeout(async () => {
        try {
          // --- Cas FRANCE : API officielle (en français) ---
          // IMPORTANT: on demande explicitement les champs utiles (centre, departement, codeDepartement)
          const resFr = await fetch(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
              value
            )}&limit=5&boost=population&fields=nom,centre,departement,codeDepartement`
          );
          const dataFr = await resFr.json();

          if (Array.isArray(dataFr) && dataFr.length > 0) {
            setSuggestions(
              dataFr.map((v) => ({
                label: `${v.nom} (${v.codeDepartement})`, // Ex: Lille (59)
                value: v.nom,
                city: v.nom,
                country: "France",
                region: v?.departement?.nom,
                deptCode: v?.codeDepartement || null,
                latitude: v?.centre?.coordinates?.[1],
                longitude: v?.centre?.coordinates?.[0],
              }))
            );
            return; // ✅ On sort, pas besoin de GeoDB si on a trouvé en FR
          }

          // --- Sinon fallback mondial via GeoDB ---
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
              label: `${v.city}${v.region ? " (" + v.region + ")" : ""}, ${v.country}`,
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

  // Quand une ville est choisie (on prend la suggestion complète, pas juste le nom)
  const handleVilleSelect = (villeObj) => {
    // Si c'est une ville FR, on affiche "Ville (XX)" ; sinon, on garde le label brut ("City, Country")
    const isFrance = villeObj.country === "France";
    const labelAffichee = isFrance
      ? `${villeObj.city}${villeObj.deptCode ? ` (${villeObj.deptCode})` : ""}`
      : villeObj.label;

    setForm((prev) => ({
      ...prev,
      localisation: labelAffichee, // On stocke la string à afficher
      latitude: villeObj.latitude,
      longitude: villeObj.longitude,
      // On conserve aussi des infos utiles si FR
      country: villeObj.country || null,
      deptCode: villeObj.deptCode || null,
      region: villeObj.region || null,
    }));
    setLocalisationInput(labelAffichee);
    setSuggestions([]);
  };

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

  // --- Photo obligatoire + coordonnées monde ---
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
      if (!form.age || !form.consent || !form.localisation || !photo)
        return setError("Merci de compléter tous les champs requis, photo comprise."), false;
    }

    setError("");
    return true;
  };

  // --- Envoi Form ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!captchaToken) return setError("Merci de valider le reCAPTCHA.");
    if (!validateStep()) return;

    try {
      setLoading(true);
      const formData = new FormData();

      // Si coords déjà renseignées (choix suggestion), sinon on tente de fetch (fallback)
      let latitude = form.latitude;
      let longitude = form.longitude;

      // Fallback si non défini, tente une résolution serveur
      if (typeof latitude === "undefined" || typeof longitude === "undefined") {
        try {
          const coords = await getCoordsFromVille(form.localisation);
          latitude = coords.latitude;
          longitude = coords.longitude;
        } catch {
          // ignore, on laisse vide si non trouvé
        }
      }

      Object.entries({
        ...form,
        latitude,
        longitude,
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
        <h1 className="form-title">Inscription</h1>
        <p className="form-step">Étape {step} / 3</p>
        <form onSubmit={handleSubmit} className="form-container">
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          {/* ETAPE 1 */}
          {step === 1 && (
            <>
              <input type="text" name="nom" placeholder="Nom" onChange={handleChange} className="form-input" />
              <input type="text" name="prenom" placeholder="Prénom" onChange={handleChange} className="form-input" />
              <input type="text" name="pseudo" placeholder="Pseudo" onChange={handleChange} className="form-input" />
              <input type="email" name="email" placeholder="Email" onChange={handleChange} className="form-input" />

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
                  {/* Icones */}
                  {showPassword ? <span role="img" aria-label="eye-slash">🙈</span> : <span role="img" aria-label="eye">👁️</span>}
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
                  {showConfirmPassword ? <span role="img" aria-label="eye-slash">🙈</span> : <span role="img" aria-label="eye">👁️</span>}
                </button>
              </div>

              <div className="form-buttons">
                <Button type="button" title="Suivant" onClick={() => validateStep() && nextStep()} color="var(--primary-color)" />
              </div>
            </>
          )}

          {/* ETAPE 2 */}
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
                  value={form.type ? { value: form.type, label: typeLabel(form.type) } : null}
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
                  value={form.orientation ? { value: form.orientation, label: orientationLabel(form.orientation) } : null}
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

          {/* ETAPE 3 */}
          {step === 3 && (
            <>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  name="localisation"
                  placeholder="Ville (Monde entier)"
                  value={localisationInput}
                  onChange={handleLocalisationChange}
                  className="form-input"
                  autoComplete="off"
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
              <input type="number" name="age" placeholder="Âge" onChange={handleChange} className="form-input" />

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
                <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} />
                J’accepte les CGU et j’ai plus de 18 ans.
              </label>
              <ReCAPTCHA sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY} onChange={setCaptchaToken} />
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

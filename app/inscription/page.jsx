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
        {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#e0c084"class="bi bi-eye-slash-fill" viewBox="0 0 16 16">
  <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/>
  <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
</svg> : <svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="24" height="24" viewBox="0 0 1280.000000 662.000000" preserveAspectRatio="xMidYMid meet" color="white">
<metadata>
Created by potrace 1.15, written by Peter Selinger 2001-2017
</metadata>
<g transform="translate(0.000000,662.000000) scale(0.100000,-0.100000)" fill="#e0c084"stroke="none">
<path d="M6330 6609 c-1718 -102 -3518 -884 -5200 -2260 -336 -274 -685 -593 -956 -873 l-173 -178 91 -99 c144 -156 523 -517 803 -764 1394 -1232 2845 -2012 4275 -2299 486 -97 816 -130 1320 -130 383 -1 517 7 845 49 1372 176 2726 781 3982 1781 517 411 1037 915 1406 1362 l78 93 -27 32 c-463 555 -984 1081 -1491 1504 -1537 1283 -3211 1885 -4953 1782z m464 -584 c362 -42 679 -139 1002 -304 957 -491 1538 -1464 1501 -2511 -22 -585 -223 -1125 -593 -1590 -87 -109 -314 -336 -424 -424 -403 -322 -876 -525 -1410 -607 -214 -33 -590 -33 -810 0 -560 83 -1055 305 -1470 656 -119 101 -310 302 -403 423 -298 389 -481 840 -542 1332 -30 243 -15 583 35 831 237 1162 1221 2047 2440 2193 160 19 514 20 674 1z"/>
<path d="M6325 4819 c-557 -58 -1040 -395 -1274 -889 -180 -380 -196 -802 -47 -1188 166 -430 522 -771 959 -917 203 -68 276 -79 527 -79 212 0 232 1 345 28 147 34 230 64 360 126 437 210 750 611 852 1090 28 130 25 469 -4 600 -58 259 -165 475 -334 677 -331 394 -863 606 -1384 552z"/>
</g>
</svg>}
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
        {showConfirmPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#e0c084" class="bi bi-eye-slash-fill" viewBox="0 0 16 16">
  <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/>
  <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
</svg> : <svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="24" height="24" viewBox="0 0 1280.000000 662.000000" preserveAspectRatio="xMidYMid meet" color="white">
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

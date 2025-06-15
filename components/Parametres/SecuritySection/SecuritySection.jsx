"use client";

import { useState } from "react";
import "./SecuritySection.css";

export default function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState({ current: false, new: false, confirm: false });
  const [message, setMessage] = useState("");

  const [deletePass, setDeletePass] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  const handleUpdatePassword = async () => {
  if (newPass !== confirm) return setMessage("Les mots de passe ne correspondent pas.");

  try {
    const res = await fetch("/api/utilisateur/update-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✅ INDISPENSABLE pour envoyer le cookie token
      body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });

    if (res.ok) setMessage("✅ Mot de passe mis à jour !");
    else {
      const data = await res.json();
      setMessage("❌ " + (data.error || "Erreur inconnue."));
    }
  } catch {
    setMessage("❌ Erreur serveur.");
  }
};


  const handleDeleteAccount = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ?")) return;

    try {
      const res = await fetch("/api/utilisateur/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePass }),
      });

      if (res.ok) {
        alert("Compte supprimé");
        window.location.href = "/";
      } else {
        setDeleteMessage("Mot de passe incorrect ou erreur.");
      }
    } catch {
      setDeleteMessage("Erreur serveur.");
    }
  };

  const toggleVisibility = (field) => {
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="security-section">
      <h2>🔐 Changer le mot de passe</h2>

      <div className="password-rules">
        <p>✔️ 8 caractères minimum</p>
        <p>✔️ Au moins un chiffre</p>
        <p>✔️ Une majuscule</p>
        <p>✔️ Une minuscule</p>
        <p>✔️ Un caractère spécial</p>
      </div>

      <div className="password-change">
        <input
          type={visible.current ? "text" : "password"}
          placeholder="Mot de passe actuel"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="password-change-input"
        />
        <button onClick={() => toggleVisibility("current")}>👁️</button>

        <input
          type={visible.new ? "text" : "password"}
          placeholder="Nouveau mot de passe"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />
        <button onClick={() => toggleVisibility("new")}>👁️</button>

        <input
          type={visible.confirm ? "text" : "password"}
          placeholder="Saisir à nouveau"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button onClick={() => toggleVisibility("confirm")}>👁️</button>

        <button className="valider" onClick={handleUpdatePassword}>VALIDER</button>
        {message && <p className="message">{message}</p>}
      </div>

      <hr />

      <div className="delete-account">
        <h3>❌ Supprimer mon compte</h3>
        <p>⚠️ Cette action est irréversible.</p>
        <input
          type="password"
          placeholder="Confirmez avec votre mot de passe"
          value={deletePass}
          onChange={(e) => setDeletePass(e.target.value)}
        />
        <button className="supprimer" onClick={handleDeleteAccount}>SUPPRIMER MON COMPTE</button>
        {deleteMessage && <p className="message">{deleteMessage}</p>}
      </div>
    </div>
  );
}

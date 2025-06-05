'use client';

import React, { useState } from 'react';

export default function CreerGaleriePrivee({ utilisateurId, onCreated }) {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/galeries-privees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, codeAcces: code, utilisateurId })
    });
    if (res.ok) {
      const newGalerie = await res.json();       // ⬅️
      setMessage('Galerie créée !');
      setNom('');
      setCode('');
      if (onCreated) onCreated(newGalerie);      // ⬅️ Passe la galerie créée au parent
    } else {
      setMessage('Erreur lors de la création');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '24px 0' }}>
      <h4>Créer une galerie privée</h4>
      <input
        value={nom}
        onChange={e => setNom(e.target.value)}
        placeholder="Nom de la galerie"
        required
        style={{ marginRight: 8 }}
      />
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Code d'accès"
        type="password"
        required
        style={{ marginRight: 8 }}
      />
      <button type="submit">Créer</button>
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </form>
  );
}

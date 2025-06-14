'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import './Abonnement.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

const tarifs = [
  {
    id: 'price_1RZtf8C6VTSOAG6HIxymxtwg', // BASIC
    nom: 'BASIC',
    description: '14,90 € / mois',
    montant: '14,90 €',
    details: 'Renouvellement automatique chaque mois',
  },
  {
    id: 'price_1RZtf8C6VTSOAG6HGYWbvldN', // STANDARD
    nom: 'STANDARD',
    description: '44,90 € / 3 mois',
    montant: '44,90 €',
    details: 'Renouvellement tous les 3 mois',
  },
  {
    id: 'price_1RZtf8C6VTSOAG6HErwRyPRH', // PREMIUM
    nom: 'PREMIUM',
    description: '99,90 € / an',
    montant: '99,90 €',
    details: 'Renouvellement automatique chaque année',
  },
];


export default function PageAbonnement() {
  const [loadingId, setLoadingId] = useState(null);

  const handleSubscribe = async (priceId) => {
    console.log("💳 Abonnement sélectionné avec priceId :", priceId);

    if (!priceId) {
      alert("Erreur : identifiant du tarif manquant.");
      return;
    }

    setLoadingId(priceId);
    const stripe = await stripePromise;

    const res = await fetch('/api/abonnement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();
    if (data?.sessionId) {
      stripe.redirectToCheckout({ sessionId: data.sessionId });
    } else {
      console.error("❌ Erreur Stripe :", data);
      alert('Erreur lors de la création de la session');
      setLoadingId(null);
    }
  };

  return (
    <div className="abonnement-page">
      <h1>Choisissez votre formule</h1>
      <div className="tarif-grid">
        {tarifs.map((tarif) => {
          if (!tarif.id) {
            console.warn(`⚠️ ID manquant pour le tarif ${tarif.nom}`);
            return null;
          }

          return (
            <div className="tarif-card" key={tarif.id}>
              <h2>{tarif.nom}</h2>
              <p className="tarif-prix">{tarif.description}</p>
              <p className="tarif-details">{tarif.details}</p>
              <button
                className="tarif-btn"
                onClick={() => handleSubscribe(tarif.id)}
                disabled={loadingId === tarif.id}
              >
                {loadingId === tarif.id ? 'Redirection...' : 'S’abonner'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

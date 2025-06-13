// /pages/api/verify.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Méthode non autorisée");

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      return_url: process.env.STRIPE_RETURN_URL,
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata: {
        user_id: "123", // Vous pouvez le personnaliser avec l'ID utilisateur réel
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Identity:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

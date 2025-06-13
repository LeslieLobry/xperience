// /pages/api/verification-status.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Méthode non autorisée");

  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: "session_id manquant" });

  try {
    const session = await stripe.identity.verificationSessions.retrieve(sessionId);
    return res.status(200).json({
      id: session.id,
      status: session.status,
      verified: session.status === "verified",
      last_error: session.last_error,
    });
  } catch (err) {
    console.error("Erreur de récupération de la session:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

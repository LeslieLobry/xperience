// /app/api/verify/route.js
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16", // ou votre version actuelle
});

export async function POST(req) {
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
        user_id: "123", // remplacez dynamiquement si besoin
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Identity:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

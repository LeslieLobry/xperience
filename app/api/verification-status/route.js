// /app/api/verification-status/route.js
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id manquant" }, { status: 400 });
  }

  try {
    const session = await stripe.identity.verificationSessions.retrieve(sessionId);

    return NextResponse.json({
      id: session.id,
      status: session.status,
      verified: session.status === "verified",
      last_error: session.last_error,
    });
  } catch (err) {
    console.error("Erreur de récupération de la session:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// /app/api/verify/route.js
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profil/${user.id}`, // Redirection après vérif
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata: {
        userId: user.id.toString(), // 🔐 très important pour le webhook
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Identity:", err);
    return NextResponse.json({ error: "Erreur serveur Stripe" }, { status: 500 });
  }
}

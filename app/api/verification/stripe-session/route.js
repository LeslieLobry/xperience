import Stripe from 'stripe';
import { getUserFromToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();
const DOMAIN = process.env.NEXT_PUBLIC_URL;

export async function POST() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.id || !user.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // Création de la session Stripe
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: user.id.toString(),
      },
      return_url: `${DOMAIN}/verification-finish`,
      options: {
        document: {
          require_matching_selfie: true, // ✅ selfie requis
        },
      },
    });

    // 🚨 TEMPORAIRE : mise à jour immédiate comme si la vérification était réussie
    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        verificationIdentite: true,
      },
    });

    return NextResponse.json({ url: verificationSession.url });
  } catch (error) {
    console.error("Erreur Stripe ou Prisma :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

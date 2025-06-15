import Stripe from 'stripe';
import { getUserFromToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.NEXT_PUBLIC_URL;

export async function POST() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.id || !user.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: {
      userId: user.id.toString(),
    },
    return_url: `${DOMAIN}/verification-finish`,
    options: {
      document: {
        require_matching_selfie: true, // ✅ selfie requis avec la pièce d'identité
      },
    },
  });

  return NextResponse.json({ url: verificationSession.url });
}

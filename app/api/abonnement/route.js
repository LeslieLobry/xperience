// app/api/abonnement/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromToken } from '../../../lib/auth';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.json();
  const { priceId } = body;

  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const DOMAIN = process.env.NEXT_PUBLIC_URL;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: `${DOMAIN}/abonnement/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/abonnement/cancel`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('Erreur création session Stripe :', err);
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 });
  }
}

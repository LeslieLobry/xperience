import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { buffer } from 'micro';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  const sig = req.headers['stripe-signature'];
  const body = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erreur webhook Stripe :', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object;

    const userId = session.metadata.userId;

    await prisma.utilisateur.update({
      where: { id: parseInt(userId) },
      data: {
        verificationIdentite: true,
      },
    });

    console.log(`✅ Utilisateur ${userId} vérifié`);
  }

  return NextResponse.json({ received: true });
}

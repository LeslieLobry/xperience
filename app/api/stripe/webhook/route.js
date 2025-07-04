import { NextResponse } from 'next/server';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const prisma = new PrismaClient();

export async function POST(req) {
  // Vercel/Next.js headers sont parfois différents :
  const sig = req.headers.get('stripe-signature') || req.headers['stripe-signature'];
  const buf = await req.arrayBuffer ? Buffer.from(await req.arrayBuffer()) : await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erreur webhook Stripe :', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      await prisma.utilisateur.update({
        where: { id: parseInt(userId) },
        data: { verificationIdentite: true },
      });
      console.log(`✅ Utilisateur ${userId} vérifié`);
    }
  }

  return NextResponse.json({ received: true });
}

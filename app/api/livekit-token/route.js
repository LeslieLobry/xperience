import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req) {
  const { identity, room } = await req.json();

  if (!identity || !room) {
    return NextResponse.json({ error: 'Missing identity or room' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_LIVEKIT_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Clé API ou secret manquant' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
  });

  at.addGrant({ roomJoin: true, room });

  const token = await at.toJwt();

  return NextResponse.json({ token });
}

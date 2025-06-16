// app/api/ably-token/route.js
import { NextResponse } from "next/server";
import Ably from "ably/promises";

const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

export async function GET(req) {
  const client = new Ably.Rest(apiKey);
  const tokenRequest = await client.auth.createTokenRequest({});
  return NextResponse.json(tokenRequest);
}

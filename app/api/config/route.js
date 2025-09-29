import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:19006",
];

function cors(response, origin) {
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Vary", "Origin");
  return response;
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return cors(new NextResponse(null, { status: 204 }), allow);
}

export async function GET(req) {
  const origin = req.headers.get("origin");
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""; // <- côté serveur
  return cors(NextResponse.json({ RECAPTCHA_SITE_KEY }), allow);
}

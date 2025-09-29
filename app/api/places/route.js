import { NextResponse } from "next/server";

const GEODB_HOST = "wft-geo-db.p.rapidapi.com";
const GEODB_KEY  = process.env.NEXT_PUBLIC_GEODB_API_KEY; // <- secret serveur, NE PAS exposer
const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  // dev Expo web preview si tu en as besoin :
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
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Number(searchParams.get("limit") || 8);

  const origin = req.headers.get("origin");
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  if (q.length < 2) {
    return cors(
      NextResponse.json({ data: [], error: null }),
      allow
    );
  }

  try {
    // 1) FRANCE d'abord
    const frUrl = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
      q
    )}&limit=${limit}&boost=population&fields=nom,centre,departement,codeDepartement`;

    const frRes = await fetch(frUrl, { next: { revalidate: 60 } });
    let fr = [];
    if (frRes.ok) {
      const dataFr = await frRes.json();
      fr = (Array.isArray(dataFr) ? dataFr : []).map((v) => ({
        city: v.nom,
        country: "France",
        countryCode: "FR",
        region: v?.departement?.nom || "",
        depCode: v?.codeDepartement || "",
        lat: v?.centre?.coordinates?.[1] ?? null,
        lon: v?.centre?.coordinates?.[0] ?? null,
      }));
    }

    if (fr.length > 0) {
      return cors(NextResponse.json({ data: fr, from: "FR" }), allow);
    }

    // 2) Monde via GeoDB (clé côté serveur uniquement)
    if (!GEODB_KEY) {
      return cors(
        NextResponse.json({ data: [], error: "GEODB_API_KEY manquant" }, { status: 500 }),
        allow
      );
    }

    const worldUrl = `https://${GEODB_HOST}/v1/geo/cities?namePrefix=${encodeURIComponent(
      q
    )}&limit=${limit}&sort=-population`;

    const wRes = await fetch(worldUrl, {
      headers: {
        "X-RapidAPI-Key": GEODB_KEY,
        "X-RapidAPI-Host": GEODB_HOST,
        Accept: "application/json",
      },
      // cache léger
      next: { revalidate: 300 },
    });

    if (!wRes.ok) {
      return cors(
        NextResponse.json({ data: [], error: "GeoDB error" }, { status: 502 }),
        allow
      );
    }

    const data = await wRes.json();
    const mapped = (data?.data || []).map((v) => ({
      city: v.city,
      country: v.country,
      countryCode: v.countryCode || null,
      region: v.region || "",
      depCode: "",
      lat: v.latitude ?? null,
      lon: v.longitude ?? null,
    }));

    return cors(NextResponse.json({ data: mapped, from: "WORLD" }), allow);
  } catch (e) {
    console.error("places proxy error:", e);
    return cors(
      NextResponse.json({ data: [], error: "Server error" }, { status: 500 }),
      allow
    );
  }
}

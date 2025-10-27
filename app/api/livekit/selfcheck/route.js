// app/api/livekit/selfcheck/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;            // https://xperiences-6q6jj78.livekit.cloud
const API_KEY     = process.env.LIVEKIT_API_KEY;
const API_SECRET  = process.env.LIVEKIT_API_SECRET;

export async function GET() {
  try {
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      return NextResponse.json({ ok: false, error: "ENV manquantes", LIVEKIT_URL: !!LIVEKIT_URL, API_KEY: !!API_KEY, API_SECRET: !!API_SECRET }, { status: 500 });
    }

    // 1) fabrique un token court
    const at = new AccessToken(API_KEY, API_SECRET, { identity: "diag-user", ttl: 120 });
    at.addGrant({ roomJoin: true, room: "conversation-999", canPublish: true, canSubscribe: true });
    const token = await at.toJwt();

    // 2) normalise l’URL base en https (sans slash final)
    const base = String(LIVEKIT_URL).replace(/^wss?:\/\//, "https://").replace(/^https?:\/\//, "https://").replace(/\/+$/, "");

    const validateUrl = `${base}/rtc/validate?access_token=${encodeURIComponent(token)}`;
    const regionsUrl  = `${base}/settings/regions`;

    // 3) tente les 2 fetch (sans cache)
    const resValidate = await fetch(validateUrl, { method: "GET", cache: "no-store" }).catch(e => ({ _err: String(e?.message || e) }));
    const resRegions  = await fetch(regionsUrl,  { method: "GET", cache: "no-store" }).catch(e => ({ _err: String(e?.message || e) }));

    return NextResponse.json({
      ok: !!(resValidate?.ok || resRegions?.ok),
      base,
      keyPrefix: API_KEY.slice(0,8),
      validate: { url: validateUrl, status: resValidate?.status ?? null, ok: !!resValidate?.ok, err: resValidate?._err || null },
      regions:  { url: regionsUrl,  status: resRegions?.status  ?? null, ok: !!resRegions?.ok,  err: resRegions?._err  || null },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
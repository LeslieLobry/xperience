// app/api/push/register/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function isExpoToken(t) {
  return (
    typeof t === "string" &&
    (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")) &&
    t.includes("]")
  );
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    const tokenRaw = body?.token;

    const token = typeof tokenRaw === "string" ? tokenRaw.trim() : null;

    if (!userId || !token) {
      return NextResponse.json(
        { ok: false, error: "userId et token requis" },
        { status: 400, headers: CORS }
      );
    }

    // Log utile (sans exposer tout le token)
    console.log("[push/register] userId=", userId, "token=", token.slice(0, 18) + "...");

    // (Optionnel) validation format Expo token
    if (!isExpoToken(token)) {
      console.log("[push/register] token format inattendu");
      // On ne bloque pas forcément, mais tu peux bloquer si tu veux :
      // return NextResponse.json({ ok:false, error:"Token invalide"},{status:400, headers:CORS});
    }

    // Support id Int OU String selon ton Prisma
    const where =
      /^\d+$/.test(String(userId)) ? { id: Number(userId) } : { id: String(userId) };

    await prisma.utilisateur.update({
      where,
      data: { expoPushToken: token },
    });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (e) {
    console.error("[push/register] ERROR", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur serveur" },
      { status: 500, headers: CORS }
    );
  }
}

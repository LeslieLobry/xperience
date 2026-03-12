import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sendPush } from "../../../lib/push";
import Ably from "ably";
import { logSiteEvent, SITE_EVENT_TYPES } from "../../../lib/siteEvents";

// 🆕 Client Ably REST (clé serveur)
const ably = new Ably.Rest(process.env.ABLY_API_KEY_SERVER);

/* ---------- CORS ---------- */
const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "https://x-periences.fr",
  "https://www.x-periences.fr",
];

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  const h = new Headers();
  if (allowed) {
    h.set("Access-Control-Allow-Origin", allowed);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return h;
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/* ---------- helpers ---------- */
async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function getCibleId(req, body) {
  const url = new URL(req.url);

  const q = url.searchParams.get("cibleId");
  if (q && !isNaN(Number(q))) return Number(q);

  const b = body?.cibleId;
  if (b !== undefined && b !== null && !isNaN(Number(b))) return Number(b);

  return null;
}

/* ---------- Auth (cookie 'token' OU Authorization: Bearer) ---------- */
const JWT_SECRET = process.env.JWT_SECRET || "";

async function getUserFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const tokenHeader = match?.[1];

  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("token")?.value;

  const token = tokenHeader || tokenCookie;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/* ---------- POST = LIKE ---------- */
export async function POST(req) {
  const headers = corsHeaders(req);

  try {
    const body = await safeJson(req);
    const cibleIdNum = getCibleId(req, body);

    if (!cibleIdNum) {
      return NextResponse.json(
        { error: "cibleId manquant ou invalide" },
        { status: 400, headers }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401, headers }
      );
    }

    const auteurId = Number(user.id);

    if (auteurId === cibleIdNum) {
      return NextResponse.json(
        { message: "Auto-like ignoré" },
        { status: 200, headers }
      );
    }

    let like = null;

    try {
      like = await prisma.like.create({
        data: { auteurId, cibleId: cibleIdNum },
      });
    } catch (err) {
      if (err?.code === "P2002") {
        return NextResponse.json(
          { success: true, alreadyExists: true },
          { status: 200, headers }
        );
      }
      throw err;
    }

    // ✅ Tracking analytics admin : like réellement créé
    setTimeout(() => {
      logSiteEvent({
        userId: auteurId,
        type: SITE_EVENT_TYPES.LIKE_SENT,
        metadata: {
          likeId: like.id,
          cibleId: cibleIdNum,
        },
      }).catch(console.error);
    }, 0);

    await prisma.notification.create({
      data: {
        utilisateurId: cibleIdNum,
        message: "Tu as reçu un nouveau like ❤️",
        lien: `/profil/${auteurId}`,
        lu: false,
      },
    });

    const cible = await prisma.utilisateur.findUnique({
      where: { id: cibleIdNum },
      select: { expoPushToken: true, pushEnabled: true },
    });

    const auteur = await prisma.utilisateur.findUnique({
      where: { id: auteurId },
      select: { pseudo: true },
    });

    if (cible?.pushEnabled && cible.expoPushToken) {
      try {
        await sendPush(cible.expoPushToken, {
          title: "Nouveau like ❤️",
          body: `@${auteur?.pseudo ?? "Un membre"} t’a liké`,
          data: {
            url: `/(tabs)/profil/${auteurId}`,
            type: "like",
            userId: auteurId,
          },
        });
      } catch (e) {
        console.warn("⚠️ Échec push LIKE:", e?.message || e);
      }
    }

    try {
      const channelName = `user-${cibleIdNum}`;
      const channel = ably.channels.get(channelName);

      await channel.publish("new-like", {
        pseudo: auteur?.pseudo ?? "Un membre",
        fromPseudo: auteur?.pseudo ?? "Un membre",
        likerId: auteurId,
        fromId: auteurId,
        cibleId: cibleIdNum,
        url: `/(tabs)/profil/${auteurId}`,
        webLien: `/profil/${auteurId}`,
      });

      console.log("📡 Ably new-like envoyé sur", channelName);
    } catch (e) {
      console.warn("⚠️ Ably new-like error :", e?.message || e);
    }

    return NextResponse.json(like, { headers });
  } catch (err) {
    console.error("Erreur POST /likes :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers }
    );
  }
}

/* ---------- DELETE = UNLIKE ---------- */
export async function DELETE(req) {
  const headers = corsHeaders(req);

  try {
    const body = await safeJson(req);
    const cibleIdNum = getCibleId(req, body);

    if (!cibleIdNum) {
      return NextResponse.json(
        { error: "cibleId manquant ou invalide" },
        { status: 400, headers }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401, headers }
      );
    }

    await prisma.like.deleteMany({
      where: {
        auteurId: Number(user.id),
        cibleId: Number(cibleIdNum),
      },
    });

    return NextResponse.json({ success: true }, { headers });
  } catch (err) {
    console.error("Erreur DELETE /likes :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers }
    );
  }
}
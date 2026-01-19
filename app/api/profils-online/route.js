// app/api/profils-online/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const secret = process.env.JWT_SECRET;

function noStoreJson(body, init = {}) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function POST(req) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, secret);
        userId = Number(decoded.id || decoded.sub) || null;
      } catch {}
    }

    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];

    if (ids.length === 0) {
      return noStoreJson({ ok: true, utilisateurs: [] });
    }

    // ✅ ids numériques valides
    const idsNum = ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));

    if (idsNum.length === 0) {
      return noStoreJson({ ok: true, utilisateurs: [] });
    }

    let where = { id: { in: idsNum } };

    if (userId) {
      const exclus = await getIdsUtilisateursExclus(userId);
      where = {
        AND: [
          { id: { in: idsNum } },
          { id: { not: userId } }, // pas moi
          { id: { notIn: exclus } }, // pas les bloqués/exclus
        ],
      };
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        localisation: true,
        statut: true,
        statutAuto: true,
        lastSeenAt: true,
        type: true,
        verificationIdentiteStatut: true,
      },
      // optionnel : pour afficher les plus récents en premier
      orderBy: { id: "desc" },
      take: 2000, // large, car tu veux "toute la liste"
    });

    return noStoreJson({ ok: true, utilisateurs });
  } catch (e) {
    console.error("Erreur API /profils-online:", e);
    return noStoreJson({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

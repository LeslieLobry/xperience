import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const secret = process.env.JWT_SECRET;

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
      return NextResponse.json({ ok: true, utilisateurs: [] });
    }

    // ✅ exclure les ids invalides
    const idsNum = ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));

    let where = { id: { in: idsNum } };

    // ✅ appliquer les exclusions
    if (userId) {
      const exclus = await getIdsUtilisateursExclus(userId);
      where = {
        AND: [
          { id: { in: idsNum } },
          { id: { notIn: exclus } }, // on exclut les bloqués etc.
          { id: { not: userId } },   // on ne montre pas "moi"
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
      orderBy: { id: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, utilisateurs });
  } catch (e) {
    console.error("Erreur API /profils-online:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

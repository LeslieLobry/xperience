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
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function pickSample(arr, n = 10) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n);
}

function asNumIds(list) {
  return [...new Set(
    (Array.isArray(list) ? list : [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
  )];
}

async function getCurrentUserId() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token || !secret) return null;

    const decoded = jwt.verify(token, secret);
    return Number(decoded.id || decoded.sub) || null;
  } catch (e) {
    console.log("[profils-online] jwt invalid:", e?.message || e);
    return null;
  }
}

export async function POST(req) {
  const t0 = Date.now();
  const reqId = Math.random().toString(16).slice(2, 8);

  try {
    const userId = await getCurrentUserId();

    const body = await req.json().catch(() => null);
    const idsRaw = Array.isArray(body?.ids) ? body.ids : [];
    const idsNum = asNumIds(idsRaw);

    console.log(
      `[profils-online:${reqId}] START userId=${userId} idsRawLen=${idsRaw.length} idsNumLen=${idsNum.length}`
    );
    console.log(`[profils-online:${reqId}] idsNum sample=`, pickSample(idsNum, 15));

    if (idsNum.length === 0) {
      return noStoreJson({
        ok: true,
        utilisateurs: [],
        debug: {
          reqId,
          userId,
          idsRawLen: idsRaw.length,
          idsNumLen: idsNum.length,
          tookMs: Date.now() - t0,
        },
      });
    }

    let exclusNum = [];

    if (userId) {
      const exclus = await getIdsUtilisateursExclus(userId);
      exclusNum = asNumIds(exclus);

      console.log(
        `[profils-online:${reqId}] exclusNumLen=${exclusNum.length} sample=`,
        pickSample(exclusNum, 30)
      );
    }

    const where = {
      AND: [
        { id: { in: idsNum } },
        { statut: "en_ligne" }, // visible seulement
        ...(userId ? [{ id: { not: userId } }] : []),
        ...(exclusNum.length ? [{ id: { notIn: exclusNum } }] : []),
      ],
    };

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
      take: 2000,
    });

    const returnedIds = utilisateurs.map((u) => u.id);
    const returnedIdSet = new Set(returnedIds);

    const missingFromDb = idsNum.filter((id) => !returnedIdSet.has(id));

    const missingBreakdown = missingFromDb.map((id) => ({
      id,
      reason:
        userId && id === userId
          ? "IS_SELF"
          : exclusNum.includes(id)
          ? "EXCLUDED"
          : "NOT_FOUND_OR_INVISIBLE",
    }));

    console.log(
      `[profils-online:${reqId}] RESULT utilisateursLen=${utilisateurs.length} missingFromDbLen=${missingFromDb.length} tookMs=${Date.now() - t0}`
    );

    return noStoreJson({
      ok: true,
      utilisateurs,
      debug: {
        reqId,
        userId,
        idsRawLen: idsRaw.length,
        idsNumLen: idsNum.length,
        exclusNumLen: exclusNum.length,
        utilisateursLen: utilisateurs.length,
        missingFromDbLen: missingFromDb.length,
        sample: {
          idsNum: pickSample(idsNum, 15),
          exclusNum: pickSample(exclusNum, 30),
          returnedIds: pickSample(returnedIds, 30),
          missingFromDb: pickSample(missingFromDb, 30),
          missingBreakdown: pickSample(missingBreakdown, 30),
        },
        tookMs: Date.now() - t0,
      },
    });
  } catch (e) {
    console.error(`[profils-online:${reqId}] ERROR`, e);
    return noStoreJson(
      { ok: false, error: "Erreur serveur", debug: { reqId } },
      { status: 500 }
    );
  }
}
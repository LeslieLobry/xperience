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

function pickSample(arr, n = 10) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n);
}

function asNumIds(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function POST(req) {
  const t0 = Date.now();
  const reqId = Math.random().toString(16).slice(2, 8);

  try {
    // ------------------- Auth userId (facultatif) -------------------
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, secret);
        userId = Number(decoded.id || decoded.sub) || null;
      } catch (e) {
        console.log(`[profils-online:${reqId}] jwt invalid:`, e?.message || e);
      }
    }

    // ------------------- Body ids -------------------
    const body = await req.json().catch(() => null);
    const idsRaw = Array.isArray(body?.ids) ? body.ids : [];

    const idsStr = idsRaw.map(String);
    const idsNum = asNumIds(idsStr);

    console.log(
      `[profils-online:${reqId}] START userId=${userId} idsRawLen=${idsRaw.length} idsNumLen=${idsNum.length}`
    );
    console.log(`[profils-online:${reqId}] idsRaw sample=`, pickSample(idsRaw, 15));
    console.log(`[profils-online:${reqId}] idsNum sample=`, pickSample(idsNum, 15));

    // ------------------- Empty guard -------------------
    if (idsNum.length === 0) {
      console.log(`[profils-online:${reqId}] EXIT empty idsNum`);
      return noStoreJson({
        ok: true,
        utilisateurs: [],
        debug: { reqId, userId, idsRawLen: idsRaw.length, idsNumLen: idsNum.length },
      });
    }

    // ------------------- Exclusions (blocages etc.) -------------------
    let exclus = [];
    let exclusNum = [];
    let where = { id: { in: idsNum } };

    if (userId) {
      exclus = await getIdsUtilisateursExclus(userId);
      exclusNum = asNumIds(exclus);

      console.log(
        `[profils-online:${reqId}] exclusLen=${Array.isArray(exclus) ? exclus.length : 0} exclusNumLen=${exclusNum.length}`
      );
      console.log(`[profils-online:${reqId}] exclus sample=`, pickSample(exclus, 30));
      console.log(`[profils-online:${reqId}] exclusNum sample=`, pickSample(exclusNum, 30));

      // ✅ LOG: ids demandés exclus
      const idsExcluded = idsNum.filter((id) => exclusNum.includes(id));
      console.log(
        `[profils-online:${reqId}] idsExcludedByExclusLen=${idsExcluded.length} sample=`,
        pickSample(idsExcluded, 50)
      );

      where = {
        AND: [
          { id: { in: idsNum } },
          { id: { not: userId } }, // pas moi
          { id: { notIn: exclusNum } }, // pas les bloqués/exclus
        ],
      };
    }

    // ✅ LOG: résumé du where (sans spam)
    console.log(`[profils-online:${reqId}] WHERE summary=`, {
      idsNumLen: idsNum.length,
      hasUserId: !!userId,
      exclusNumLen: exclusNum.length,
    });

    // ------------------- DB query -------------------
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

    // ------------------- Missing analysis -------------------
    const returnedIds = utilisateurs.map((u) => u.id);
    const returnedIdSet = new Set(returnedIds);

    // ✅ IDs demandés absents du résultat
    const missingFromDb = idsNum.filter((id) => !returnedIdSet.has(id));

    // ✅ LOG: cas "profil connecté mais pas renvoyé"
    const missingBreakdown = missingFromDb.map((id) => ({
      id,
      reason: userId && id === userId ? "IS_SELF" : exclusNum.includes(id) ? "EXCLUDED" : "NOT_FOUND_OR_FILTERED",
    }));

    console.log(
      `[profils-online:${reqId}] RESULT utilisateursLen=${utilisateurs.length} missingFromDbLen=${missingFromDb.length} tookMs=${Date.now() - t0}`
    );
    console.log(`[profils-online:${reqId}] returnedIds sample=`, pickSample(returnedIds, 30));
    if (missingFromDb.length) {
      console.log(`[profils-online:${reqId}] missingFromDb sample=`, pickSample(missingFromDb, 50));
      console.log(
        `[profils-online:${reqId}] missingBreakdown sample=`,
        pickSample(missingBreakdown, 50)
      );
    }

    // ✅ LOG: si un id demandé = moi, on le note explicitement
    if (userId && idsNum.includes(userId)) {
      console.log(`[profils-online:${reqId}] NOTE: requested list contains SELF id=${userId} (filtered out)`);
    }

    return noStoreJson({
      ok: true,
      utilisateurs,
      debug: {
        reqId,
        userId,
        idsRawLen: idsRaw.length,
        idsNumLen: idsNum.length,
        exclusLen: Array.isArray(exclus) ? exclus.length : 0,
        exclusNumLen: exclusNum.length,
        utilisateursLen: utilisateurs.length,
        missingFromDbLen: missingFromDb.length,
        sample: {
          idsNum: pickSample(idsNum, 15),
          exclus: pickSample(exclus, 30),
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
    return noStoreJson({ ok: false, error: "Erreur serveur", debug: { reqId } }, { status: 500 });
  }
}

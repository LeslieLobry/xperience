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

export async function POST(req) {
  const t0 = Date.now();
  const reqId = Math.random().toString(16).slice(2, 8);

  try {
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

    const body = await req.json().catch(() => null);
    const idsRaw = Array.isArray(body?.ids) ? body.ids : [];

    const ids = idsRaw.map(String);
    const idsNum = ids
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    console.log(
      `[profils-online:${reqId}] START userId=${userId} idsRawLen=${idsRaw.length} idsNumLen=${idsNum.length}`
    );
    console.log(
      `[profils-online:${reqId}] idsRaw sample=`,
      pickSample(idsRaw, 15)
    );
    console.log(
      `[profils-online:${reqId}] idsNum sample=`,
      pickSample(idsNum, 15)
    );

    if (idsNum.length === 0) {
      console.log(`[profils-online:${reqId}] EXIT empty idsNum`);
      return noStoreJson({
        ok: true,
        utilisateurs: [],
        debug: { reqId, userId, idsRawLen: idsRaw.length, idsNumLen: idsNum.length },
      });
    }

    let exclus = [];
    let where = { id: { in: idsNum } };

    if (userId) {
      exclus = await getIdsUtilisateursExclus(userId);
      console.log(
        `[profils-online:${reqId}] exclusLen=${Array.isArray(exclus) ? exclus.length : 0} exclusSample=`,
        pickSample(exclus, 30)
      );

      // ⚠️ IMPORTANT: exclus peut contenir des strings => on normalise en numbers pour comparer
      const exclusNum = (Array.isArray(exclus) ? exclus : [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);

      // Check rapide : est-ce que les ids demandés sont exclus ?
      const idsExcluded = idsNum.filter((id) => exclusNum.includes(id));
      if (idsExcluded.length) {
        console.log(
          `[profils-online:${reqId}] WARNING idsExcludedByExclus=`,
          idsExcluded.slice(0, 50)
        );
      }

      where = {
        AND: [
          { id: { in: idsNum } },
          { id: { not: userId } }, // pas moi
          { id: { notIn: exclusNum } }, // pas les bloqués/exclus
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
      take: 2000,
    });

    const returnedIds = utilisateurs.map((u) => u.id);
    const missingFromDb = idsNum.filter((id) => !returnedIds.includes(id));

    console.log(
      `[profils-online:${reqId}] RESULT utilisateursLen=${utilisateurs.length} missingFromDbLen=${missingFromDb.length} tookMs=${Date.now() - t0}`
    );
    console.log(
      `[profils-online:${reqId}] returnedIds sample=`,
      pickSample(returnedIds, 30)
    );
    if (missingFromDb.length) {
      console.log(
        `[profils-online:${reqId}] missingFromDb sample=`,
        pickSample(missingFromDb, 50)
      );
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
        utilisateursLen: utilisateurs.length,
        missingFromDbLen: missingFromDb.length,
        sample: {
          idsNum: pickSample(idsNum, 15),
          exclus: pickSample(exclus, 30),
          returnedIds: pickSample(returnedIds, 30),
          missingFromDb: pickSample(missingFromDb, 30),
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

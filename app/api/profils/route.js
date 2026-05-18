// app/api/profils/route.js

import { prisma } from "../../../lib/prisma";
import { okJSON, errorJSON, preflight } from "../../../lib/cors";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";

const secret = process.env.JWT_SECRET;

export async function OPTIONS(req) {
  return preflight(req);
}

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("token")?.value || null;

    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const token = cookieToken || bearerToken;

    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, secret);
        userId = Number(decoded.id || decoded.sub) || null;
      } catch {}
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "24", 10), 100);

    let where = {};
    if (userId) {
      const exclus = await getIdsUtilisateursExclus(userId);
      where = {
        NOT: {
          id: { in: [...exclus, userId] },
        },
      };
    }

    let utilisateurs = [];
    let nextCursor = null;

    const select = {
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
    };

    if (cursor) {
      const cursorNum = Number(cursor);
      const rows = await prisma.utilisateur.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit + 1,
        skip: 1,
        cursor: { id: cursorNum },
        select,
      });

      if (rows.length > limit) {
        const last = rows[rows.length - 1];
        nextCursor = String(last.id);
        utilisateurs = rows.slice(0, limit);
      } else {
        utilisateurs = rows;
      }
    } else if (page > 0) {
      const skip = (page - 1) * limit;
      utilisateurs = await prisma.utilisateur.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select,
      });
    } else {
      const rows = await prisma.utilisateur.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit + 1,
        select,
      });

      if (rows.length > limit) {
        const last = rows[rows.length - 1];
        nextCursor = String(last.id);
        utilisateurs = rows.slice(0, limit);
      } else {
        utilisateurs = rows;
      }
    }

    return okJSON(req, { ok: true, utilisateurs, page, nextCursor });
  } catch (e) {
    console.error("Erreur API /profils:", e);
    return errorJSON(req, { ok: false, error: "Erreur serveur" }, 500);
  }
}
// app/api/photos/delete-by-key/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";

/* --------- config --------- */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

/* --------- helpers --------- */
function corsHeaders(origin = "") {
  const ALLOWED = [
    "http://localhost:8081",
    "http://localhost:19006",
    "https://www.x-periences.fr",
    "https://x-periences.fr",
  ];
  const allow = origin && ALLOWED.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

async function getUserFromReq(req) {
  // 1) cookie (site)
  const cookieUser = await getUserFromToken().catch(() => null);
  if (cookieUser) return cookieUser;

  // 2) Authorization: Bearer <token> (app)
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const bearerUser = await getUserFromToken(m[1]).catch(() => null);
  return bearerUser;
}

function normKey(input = "") {
  try {
    const u = new URL(input, "https://www.x-periences.fr");
    return u.pathname; // commence par /xxx
  } catch {
    return String(input).split("?")[0];
  }
}

function baseName(input = "") {
  const p = normKey(input);
  return p.split("/").pop()?.toLowerCase() || "";
}

/* --------- POST /api/photos/delete-by-key --------- */
export async function POST(req) {
  const origin = req.headers.get("origin") || "";

  try {
    const body = await req.json().catch(() => ({}));
    const rawKey = body?.key || "";

    if (!rawKey) {
      return NextResponse.json(
        { error: "missing key" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const user = await getUserFromReq(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const key = normKey(rawKey);   // ex: "/photo_1_XXXX.png"
    const name = baseName(rawKey); // ex: "photo_1_XXXX.png"

    let photo = null;

    // 1️⃣ tentative large (url + s3Key)
    try {
      photo = await prisma.photo.findFirst({
        where: {
          utilisateurId: Number(user.id),
          OR: [
            { url: key },
            { s3Key: key },
            { url: { endsWith: name } },
            { s3Key: { endsWith: name } },
          ],
        },
      });
    } catch (e) {
      console.error(
        "delete-by-key: erreur Prisma sur url+s3Key, fallback url-only:",
        e?.message
      );
      // 2️⃣ fallback ultra simple : url only
      photo = await prisma.photo.findFirst({
        where: {
          utilisateurId: Number(user.id),
          url: { endsWith: name },
        },
      });
    }

    if (!photo) {
      return NextResponse.json(
        { error: "Photo introuvable", debug: { key, name } },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const urlOrKey = photo.url || photo.s3Key || "";

    // suppression fichier (S3 ou local)
    try {
      if (photo.s3Key) {
        await s3.send(
          new DeleteObjectCommand({ Bucket: BUCKET, Key: photo.s3Key })
        );
      } else if (/amazonaws\.com\//i.test(urlOrKey)) {
        const s3KeyFromUrl = urlOrKey.split("amazonaws.com/")[1];
        if (s3KeyFromUrl) {
          await s3.send(
            new DeleteObjectCommand({ Bucket: BUCKET, Key: s3KeyFromUrl })
          );
        }
      } else if (/^\/?uploads\//i.test(urlOrKey)) {
        const rel = urlOrKey.startsWith("/") ? urlOrKey.slice(1) : urlOrKey;
        const abs = path.join(process.cwd(), "public", rel);
        await fs.unlink(abs).catch(() => {});
      }
    } catch (e) {
      console.warn("delete file warning:", e?.message);
      // on ne jette pas l'erreur, on continue quand même
    }

    // suppression DB
    await prisma.photo.delete({ where: { id: photo.id } });

    return NextResponse.json(
      { success: true, id: photo.id },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (e) {
    console.error("POST /api/photos/delete-by-key error:", e);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: e?.message || "unknown",
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// app/api/photos/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

function corsHeaders(origin = "") {
  // Autorise l’app Expo + ton site (tu peux ajuster la liste si besoin)
  const ALLOWED = [
    "http://localhost:8081",
    "http://localhost:19006",
    "https://www.x-periences.fr",
    "https://x-periences.fr",
  ];
  const allow = origin && ALLOWED.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
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

  // getUserFromToken peut être adapté pour accepter un token string,
  // sinon fais une variante getUserFromRawToken(m[1]).
  const bearerUser = await getUserFromToken(m[1]).catch(() => null);
  return bearerUser;
}

export async function DELETE(req, { params }) {
  const origin = req.headers.get("origin") || "";
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400, headers: corsHeaders(origin) });
  }

  try {
    const user = await getUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: corsHeaders(origin) });
    }

    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return NextResponse.json({ error: "Photo introuvable" }, { status: 404, headers: corsHeaders(origin) });
    }

    if (Number(photo.utilisateurId) !== Number(user.id)) {
      return NextResponse.json({ error: "Interdit" }, { status: 403, headers: corsHeaders(origin) });
    }

    // Suppression du fichier
    const url = photo.url || "";
    try {
      if (/amazonaws\.com\//i.test(url)) {
        // S3
        const key = url.split("amazonaws.com/")[1];
        if (key) {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        }
      } else if (/^\/?uploads\//i.test(url)) {
        // Fichier local
        const rel = url.startsWith("/") ? url.slice(1) : url;
        const abs = path.join(process.cwd(), "public", rel);
        await fs.unlink(abs).catch(() => {});
      }
    } catch (e) {
      // on continue même si la suppression du fichier échoue
      console.warn("delete file warning:", e?.message);
    }

    // Suppression DB
    await prisma.photo.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("DELETE /api/photos/[id] error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: corsHeaders(origin) });
  }
}

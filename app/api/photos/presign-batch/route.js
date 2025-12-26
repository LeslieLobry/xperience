// app/api/photos/presign-batch/route.js
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;
const JWT_SECRET = process.env.JWT_SECRET;

// 1h
const EXPIRES_IN = 3600;

// Anti-abus : limite batch
const MAX_KEYS = 120;

const s3 =
  BUCKET && REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

// ✅ Cookie (site) OU Bearer (mobile)
async function getUserFromToken(req) {
  if (!JWT_SECRET) return null;

  // 1) Mobile: Authorization: Bearer xxx
  const auth = req?.headers?.get?.("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  // 2) Web: cookie "token"
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    // ✅ Sécurité : user obligatoire
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!s3 || !BUCKET) {
      return NextResponse.json(
        { error: "Configuration S3 manquante (bucket/region/credentials)" },
        { status: 500 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const keys = body?.keys;

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ urls: {} }, { status: 200 });
    }

    // ✅ normalise / dédoublonne / filtre
    const normalized = keys
      .filter(Boolean)
      .map((k) => (typeof k === "string" ? k.trim() : ""))
      .filter((k) => k.length > 0);

    // On ignore les URLs déjà HTTP(S) : pas besoin de presign
    const httpUrls = {};
    const s3Keys = [];

    for (const k of normalized) {
      if (k.startsWith("http://") || k.startsWith("https://")) {
        httpUrls[k] = k;
      } else {
        s3Keys.push(k);
      }
    }

    const uniqueKeys = [...new Set(s3Keys)].slice(0, MAX_KEYS);

    if (uniqueKeys.length === 0) {
      return NextResponse.json({ urls: httpUrls }, { status: 200 });
    }

    const settled = await Promise.allSettled(
      uniqueKeys.map(async (key) => {
        const command = new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
        return [key, url];
      })
    );

    const urls = { ...httpUrls };
    for (const r of settled) {
      if (r.status === "fulfilled") {
        const [key, url] = r.value || [];
        if (key && url) urls[key] = url;
      } else {
        // log soft (sans casser toute la requête)
        console.error("❌ presign-batch erreur:", r.reason);
      }
    }

    return NextResponse.json({ urls }, { status: 200 });
  } catch (err) {
    console.error("❌ /api/photos/presign-batch erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

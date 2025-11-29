// app/api/photos/presign-batch/route.js
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

// On peut garder un expiresIn assez long (ex : 3600s = 1h)
const EXPIRES_IN = 3600;

export async function POST(req) {
  try {
    const { keys } = await req.json();

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ urls: {} }, { status: 200 });
    }

    // normalise / dédoublonne
    const uniqueKeys = [...new Set(keys.filter(Boolean))];

    const entries = await Promise.all(
      uniqueKeys.map(async (key) => {
        try {
          const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
          });

          const url = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
          return [key, url];
        } catch (e) {
          console.error("❌ presign-batch erreur pour key:", key, e);
          return [key, null];
        }
      })
    );

    const urls = {};
    for (const [key, url] of entries) {
      if (url) urls[key] = url;
    }

    return NextResponse.json({ urls }, { status: 200 });
  } catch (err) {
    console.error("❌ /api/photos/presign-batch erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

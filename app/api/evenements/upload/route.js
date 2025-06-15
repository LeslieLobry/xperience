import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from "../../../../lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";

// Config AWS
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

export async function POST(req) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image");

  if (!file || typeof file === "string") {
    return NextResponse.json({ success: false, message: "Fichier invalide" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compression avec sharp en webp
    const webpBuffer = await sharp(buffer)
      .resize(800)
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `evenements/${randomUUID()}.webp`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileName,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
    );

    const imageUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    return NextResponse.json({ success: true, imageUrl });

  } catch (err) {
    console.error("Erreur upload S3 :", err);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}

// /app/api/upload-article-image/route.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // adapte si besoin
    }
  }
};

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '../../../lib/auth';
import { s3 } from '../../../lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.id) {
    return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('image');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'Fichier invalide' }, { status: 400 });
  }

  // ---- MODÉRATION SIGHTENGINE ----
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const moderationForm = new FormData();
    moderationForm.append("media", new Blob([buffer], { type: file.type }), file.name);
    moderationForm.append("models", "face-attributes");
    moderationForm.append("api_user", process.env.SIGHTENGINE_USER);
    moderationForm.append("api_secret", process.env.SIGHTENGINE_SECRET);

    const moderationRes = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: moderationForm,
    });

    const moderationData = await moderationRes.json();
    if (moderationData?.faces?.length) {
      const hasMinor = moderationData.faces.some((f) => f.attributes?.minor > 0.8);
      if (hasMinor) {
        return NextResponse.json(
          { success: false, message: "Image refusée : une personne semble avoir moins de 18 ans." },
          { status: 400 }
        );
      }
    }
  } catch (err) {
    console.error("Erreur Sightengine :", err);
    return NextResponse.json({ success: false, message: "Erreur analyse image." }, { status: 500 });
  }

  // ---- UPLOAD S3 ----
  const ext = file.name.split(".").pop();
  const filename = `articles/article_${user.id}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = process.env.AWS_S3_BUCKET;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: buffer,
    ContentType: file.type,
    ACL: "public-read",
  }));

  // Tu retournes seulement la clé relative
  return NextResponse.json({ success: true, path: filename });
}

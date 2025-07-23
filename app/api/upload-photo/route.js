import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '../../../lib/auth';
import { s3 } from '../../../lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req) {
  console.log("Début traitement POST /upload-article-image");

  const cookieStore = await cookies();
  const user = await getUserFromToken(cookieStore);
  console.log("Utilisateur extrait du token :", user);

  if (!user || !user.id) {
    console.warn("Utilisateur non autorisé ou token invalide");
    return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
  }

  const formData = await req.formData();
  console.log("FormData reçue :", formData);

  const file = formData.get('image');
  console.log("Fichier récupéré :", file);

  if (!file || typeof file === 'string') {
    console.warn("Fichier invalide reçu");
    return NextResponse.json({ success: false, message: 'Fichier invalide' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // ---- MODÉRATION SIGHTENGINE ----
  try {
    const moderationForm = new FormData();
    moderationForm.append("media", new Blob([buffer], { type: file.type }), file.name);
    moderationForm.append("models", "face-attributes");
    moderationForm.append("api_user", process.env.SIGHTENGINE_USER);
    moderationForm.append("api_secret", process.env.SIGHTENGINE_SECRET);

    console.log("Envoi à Sightengine pour modération...");
    const moderationRes = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: moderationForm,
    });

    const moderationData = await moderationRes.json();
    console.log("Réponse Sightengine :", moderationData);

    if (moderationData?.faces?.length) {
      const hasMinor = moderationData.faces.some((f) => f.attributes?.minor > 0.8);
      if (hasMinor) {
        console.warn("Image refusée : mineur détecté");
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
  console.log("Nom du fichier pour S3 :", filename);
  const bucket = process.env.AWS_S3_BUCKET;
  console.log("Bucket cible :", bucket);

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }));
    console.log("Upload S3 réussi pour :", filename);
  } catch (uploadError) {
    console.error("Erreur lors de l'upload S3 :", uploadError);
    return NextResponse.json({ success: false, message: "Erreur upload S3." }, { status: 500 });
  }

  console.log("Fin traitement avec succès, retourne la clé :", filename);
  return NextResponse.json({ success: true, path: filename });
}

import { getPresignedUrl } from "../../../../lib/s3";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { key } = await req.json();

  // (Optionnel mais recommandé : vérifie ici que l'utilisateur a le droit de voir cette image !)

  try {
    const url = await getPresignedUrl(key); // key = la clé S3 stockée en BDD (ex : photo_12345.jpg ou users/7/photo_xxx.jpg)
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: "Erreur signature URL" }, { status: 500 });
  }
}

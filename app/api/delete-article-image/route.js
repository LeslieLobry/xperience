import { NextResponse } from "next/server";
import { deleteFromS3 } from "../../../lib/s3";

function extractS3Key(pathOrUrl) {
  try {
    const url = new URL(pathOrUrl);
    return url.pathname.slice(1); // enlève le "/" initial
  } catch {
    return pathOrUrl; // ce n’est pas une URL complète, on retourne tel quel
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("Erreur parse JSON body:", e);
    return NextResponse.json({ success: false, message: "Corps JSON invalide" }, { status: 400 });
  }
  console.log("Body reçu:", body);

  // Accepte 'url' ou 'key' dans le body
  const rawKey = body.url || body.key;
  if (!rawKey) {
    return NextResponse.json(
      { success: false, message: "Clé ou URL manquante." },
      { status: 400 }
    );
  }

  const key = extractS3Key(rawKey);

  try {
    await deleteFromS3(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression S3 :", error);
    return NextResponse.json(
      { success: false, message: "Erreur suppression S3" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json(
      { success: false, message: "URL manquante." },
      { status: 400 }
    );
  }

  // 👉 ICI : suppression réelle à implémenter si besoin (Cloudinary, S3, etc.)
  console.log("🗑️ Suppression demandée pour :", url);

  // On retourne une réponse de succès simulée
  return NextResponse.json({ success: true });
}

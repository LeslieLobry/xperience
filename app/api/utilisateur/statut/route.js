import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

const secret = process.env.JWT_SECRET;

export async function GET() {
  const token = cookies().get("token")?.value;
  if (!token || !secret)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      pseudo: true,
      role: true,
      emailVerified: true,
      statut: true,
      statutAuto: true,
    },
  });

  if (!utilisateur)
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  return NextResponse.json({ utilisateur });
}

export async function POST(req) {
  try {
    const token = cookies().get("token")?.value;
    if (!token || !secret)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ error: "Token invalide" }, { status: 403 });
    }

    const body = await req.json();
    const { statut, statutAuto } = body;

    console.log("📩 Requête POST statut reçue :", { statut, statutAuto });

    if (statut && !["en_ligne", "hors_ligne"].includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: { statutAuto: true },
    });

    const dataToUpdate = {};

    if (typeof statutAuto === "boolean") {
      dataToUpdate.statutAuto = statutAuto;
      if (statut) dataToUpdate.statut = statut;
      console.log("🎛️ Changement manuel : ", dataToUpdate);
    } else if (typeof statut === "string" && utilisateur?.statutAuto === true) {
      dataToUpdate.statut = statut;
      console.log("🔁 Changement automatique :", dataToUpdate);
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.utilisateur.update({
        where: { id: decoded.id },
        data: dataToUpdate,
      });
      console.log("✅ Mise à jour réussie");
    } else {
      console.log("⏭️ Aucune mise à jour effectuée (conditions non remplies)");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur dans la mise à jour du statut :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

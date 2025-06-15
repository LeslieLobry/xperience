import { compare } from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

export async function DELETE(req) {
  try {
    const { password } = await req.json();
    const user = await getUserFromToken(); // ✅ Avec cookies()

    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: user.id },
      include: {
        galeriePrivee: { include: { photos: true } },
        photos: true,
      },
    });

    if (!utilisateur) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const passwordMatch = await compare(password, utilisateur.password);
    if (!passwordMatch) return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 403 });

    // 🧹 Suppressions liées
    await prisma.avis.deleteMany({
      where: { OR: [{ auteurId: user.id }, { cibleId: user.id }] },
    });

    await prisma.demandeAcces.deleteMany({
      where: { OR: [{ demandeurId: user.id }, { proprietaireId: user.id }] },
    });

    await prisma.participant.deleteMany({ where: { utilisateurId: user.id } });
    await prisma.message.deleteMany({ where: { auteurId: user.id } });
    await prisma.globalMessage.deleteMany({ where: { auteurId: user.id } });

    await prisma.like.deleteMany({
      where: { OR: [{ auteurId: user.id }, { cibleId: user.id }] },
    });

    await prisma.notification.deleteMany({ where: { utilisateurId: user.id } });
    await prisma.recherche.deleteMany({ where: { utilisateurId: user.id } });
    await prisma.envie.deleteMany({ where: { utilisateurId: user.id } });

    await prisma.blocage.deleteMany({
      where: { OR: [{ bloqueurId: user.id }, { bloquéId: user.id }] },
    });

    await prisma.article.deleteMany({ where: { auteurId: user.id } });
    await prisma.globalChatRead.deleteMany({ where: { userId: user.id } });

    // 📦 Suppression des photos S3 (privées et publiques)
    const toutesPhotos = [
      ...(utilisateur.photos || []),
      ...(utilisateur.galeriePrivee?.photos || []),
    ];

    for (const photo of toutesPhotos) {
      const url = photo.url;
      const key = url.split("amazonaws.com/")[1];
      if (key) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        console.log("✅ Fichier supprimé de S3 :", url);
      }
    }

    // 🔥 Supprimer les enregistrements Photo et Galerie
    if (utilisateur.galeriePrivee) {
      await prisma.photo.deleteMany({ where: { galeriePriveeId: utilisateur.galeriePrivee.id } });
      await prisma.galeriePrivee.delete({ where: { id: utilisateur.galeriePrivee.id } });
    }

    await prisma.photo.deleteMany({ where: { utilisateurId: user.id } });

    // 🧨 Supprimer l'utilisateur
    await prisma.utilisateur.delete({ where: { id: user.id } });

    // ✅ Supprimer le cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: true,
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (err) {
    console.error("Erreur DELETE /delete :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

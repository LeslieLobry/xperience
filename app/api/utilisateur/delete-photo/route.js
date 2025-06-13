// pages/api/utilisateur/delete-photo.js
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { deleteFromS3 } from "../../../../lib/s3";

export async function DELETE(req) {
  const user = await getUserFromToken();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const currentUser = await prisma.utilisateur.findUnique({
    where: { id: user.id },
    select: { photoUrl: true },
  });

  if (!currentUser?.photoUrl) {
    return NextResponse.json({ error: "Pas de photo à supprimer." }, { status: 400 });
  }

  const urlParts = currentUser.photoUrl.split("/");
  const key = urlParts[urlParts.length - 1]; // "photo_123456789.webp"

  try {
    await deleteFromS3(key);

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Erreur suppression", details: err.message }, { status: 500 });
  }
}

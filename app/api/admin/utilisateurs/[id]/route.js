import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma"; // 🔁 adapte si besoin
import { getUserFromToken } from "../../../../../lib/auth"; // 🔁 idem

// Si tu as un helper pour S3, tu pourras l'utiliser ici
// import { deleteManyFromS3 } from "../../../../../lib/s3-delete";

export async function DELETE(req, { params }) {
  const userId = Number(params.id);

  if (!userId || Number.isNaN(userId)) {
    return NextResponse.json(
      { error: "ID utilisateur invalide" },
      { status: 400 }
    );
  }

  try {
    // 1️⃣ Auth & droits admin
    const currentUser = await getUserFromToken(req);

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: "Tu ne peux pas supprimer ton propre compte administrateur." },
        { status: 400 }
      );
    }

    // 2️⃣ On récupère l'utilisateur à supprimer
    const userToDelete = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        photoUrl: true,
      },
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (userToDelete.role === "ADMIN") {
      return NextResponse.json(
        { error: "Impossible de supprimer un autre administrateur." },
        { status: 400 }
      );
    }

    // 3️⃣ Transaction : on supprime TOUT ce qui est lié
    const s3Keys = await prisma.$transaction(async (tx) => {
      const keys = [];

      // 🗂️ Photo de profil
      if (userToDelete.photoUrl) {
        keys.push(userToDelete.photoUrl);
      }

      // 🖼️ Photos de l'utilisateur (galerie publique/privée)
      const photos = await tx.photo.findMany({
        where: { utilisateurId: userId },
        select: { url: true },
      });
      for (const p of photos) {
        keys.push(p.url);
      }

      // 🪪 Vérification d'identité : photos CI + selfies
      const verif = await tx.verificationIdentite.findUnique({
        where: { utilisateurId: userId },
        select: {
          photoCI1Url: true,
          selfie1Url: true,
          photoCI2Url: true,
          selfie2Url: true,
        },
      });
      if (verif) {
        if (verif.photoCI1Url) keys.push(verif.photoCI1Url);
        if (verif.selfie1Url) keys.push(verif.selfie1Url);
        if (verif.photoCI2Url) keys.push(verif.photoCI2Url);
        if (verif.selfie2Url) keys.push(verif.selfie2Url);
      }

      // 📧 Tokens liés à l'email (facultatif mais propre)
      await tx.emailVerificationToken.deleteMany({
        where: { email: userToDelete.email },
      });
      await tx.passwordResetToken.deleteMany({
        where: { email: userToDelete.email },
      });

      // 💌 Notifications
      await tx.notification.deleteMany({
        where: { utilisateurId: userId },
      });

      // 🔐 Blocages
      await tx.blocage.deleteMany({
        where: {
          OR: [{ bloqueurId: userId }, { bloquéId: userId }],
        },
      });

      // 💓 Likes
      await tx.like.deleteMany({
        where: {
          OR: [{ auteurId: userId }, { cibleId: userId }],
        },
      });

      // 👀 Visites de profil
      await tx.visiteProfil.deleteMany({
        where: {
          OR: [{ visiteurId: userId }, { visiteId: userId }],
        },
      });

      // ⭐ Avis (laissés & reçus)
      await tx.avis.deleteMany({
        where: {
          OR: [{ auteurId: userId }, { cibleId: userId }],
        },
      });

      // 💬 Global chat
      await tx.globalMessage.deleteMany({
        where: { auteurId: userId },
      });
      await tx.globalChatRead.deleteMany({
        where: { userId: userId },
      });

      // 💭 Recherches & envies
      await tx.recherche.deleteMany({
        where: { utilisateurId: userId },
      });
      await tx.envie.deleteMany({
        where: { utilisateurId: userId },
      });

      // 📬 Demandes d'accès à galerie (faites + reçues)
      await tx.demandeAcces.deleteMany({
        where: {
          OR: [{ demandeurId: userId }, { proprietaireId: userId }],
        },
      });

      // 🎥 Réactions aux messages
      await tx.messageReaction.deleteMany({
        where: { utilisateurId: userId },
      });

      // 💌 Messages privés (de cet utilisateur)
      await tx.message.deleteMany({
        where: { auteurId: userId },
      });

      // 👥 Participants de conversation
      await tx.participant.deleteMany({
        where: { utilisateurId: userId },
      });

      // 👩‍❤️‍👨 Prénoms couple dans conversations
      await tx.prenomCoupleConversation.deleteMany({
        where: { utilisateurId: userId },
      });

      // 🎉 Événements créés par l'utilisateur
      await tx.evenement.deleteMany({
        where: { createurId: userId },
      });

      // 📰 Articles (et images liées -> cascade via FK)
      await tx.article.deleteMany({
        where: { auteurId: userId },
      });

      // 🖼️ Photos liées à l'utilisateur (déjà récupérées pour S3)
      await tx.photo.deleteMany({
        where: { utilisateurId: userId },
      });

      // 🔒 Galerie privée de l'utilisateur (photos déjà supprimées)
      await tx.galeriePrivee.deleteMany({
        where: { utilisateurId: userId },
      });

      // 🧪 Vérification d'identité (en base)
      await tx.verificationIdentite.deleteMany({
        where: { utilisateurId: userId },
      });

      // ✅ DigestNotification est en cascade via onDelete: Cascade
      //    sur destinataireId / messageId / likeId / visiteId / avisId
      //    donc rien à faire ici.

      // 👤 Enfin, suppression de l'utilisateur lui-même
      await tx.utilisateur.delete({
        where: { id: userId },
      });

      return keys;
    });

    // 4️⃣ Suppression des fichiers S3 (à faire hors transaction DB)
    // if (s3Keys.length > 0) {
    //   await deleteManyFromS3(s3Keys);
    // }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression utilisateur :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

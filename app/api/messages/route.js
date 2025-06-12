import { prisma } from "../../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";
import { resend } from "../../../lib/resend";

export async function POST(req) {
  console.log("⇒ POST /api/messages déclenché");

  try {
    const body = await req.json();
    const { conversationId, contenu, imageUrl, videoUrl, type } = body;

    // Récupération de l'utilisateur connecté via cookie JWT
    const cookieStore = cookies();
    const user = await getUserFromToken(cookieStore);
    if (!user) {
      return Response.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const auteurId = user.id;

    // Vérifie si l’utilisateur envoie un message à un utilisateur bloqué ou bloquant
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });

    const autresParticipants = participants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    const exclus = await getIdsUtilisateursExclus(auteurId);
    const estBloque = autresParticipants.some((id) => exclus.includes(id));
    if (estBloque) {
      return Response.json(
        { success: false, message: "Impossible d'envoyer un message à un utilisateur bloqué." },
        { status: 403 }
      );
    }

    // Création du message
    const message = await prisma.message.create({
      data: {
        conversationId,
        auteurId,
        contenu,
        imageUrl,
        videoUrl,
        type,
        lu: false,
      },
      include: { auteur: true },
    });

    // Mise à jour de la conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Création des notifications pour les autres
    const destinataires = autresParticipants;
    const auteur = message.auteur;

    await Promise.all(
      destinataires.map(destId =>
        prisma.notification.create({
          data: {
            utilisateurId: destId,
            message: `${auteur.pseudo} vous a envoyé un nouveau message`,
            lien: `/messagerie?conversationId=${conversationId}`,
            lu: false,
          },
        })
      )
    );

    // Envoi de l’email
    (async () => {
      try {
        const participantsWithUser = await prisma.participant.findMany({
          where: { conversationId },
          include: { utilisateur: true },
        });

        const destinataireEntry = participantsWithUser.find(
          (p) => p.utilisateurId !== auteurId
        );
        if (!destinataireEntry) return;
        const destinataire = destinataireEntry.utilisateur;

        if (destinataire.statut === "en_ligne" || !destinataire.email) return;

        const rawTexte = contenu || "";
        const extrait = rawTexte
          .substring(0, 100)
          .replace(/\n/g, "<br>")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        await resend.emails.send({
          from: process.env.EMAIL_FROM || "no-reply@votredomaine.com",
          to: destinataire.email,
          subject: `[VotreApp] Nouveau message de ${auteur.pseudo}`,
          html: `
            <p>Bonjour ${destinataire.pseudo},</p>
            <p>Vous avez reçu un nouveau message :</p>
            <blockquote>${extrait}…</blockquote>
            <p><a href="https://votredomaine.com/messagerie?conversationId=${conversationId}">Voir le message</a></p>
          `,
        });
      } catch (err) {
        console.error("Erreur IIFE e-mail :", err);
      }
    })();

    return Response.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans POST /api/messages :", error);
    return Response.json(
      { success: false, message: "Impossible de créer le message." },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  console.log("⇒ GET /api/messages déclenché");

  try {
    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get("conversationId"), 10);

    const cookieStore = cookies();
    const user = await getUserFromToken(cookieStore);
    if (!user) {
      return Response.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const auteurId = user.id;

    // Vérifie blocage
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });

    const autresParticipants = participants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    const exclus = await getIdsUtilisateursExclus(auteurId);
    const estBloque = autresParticipants.some((id) => exclus.includes(id));
    if (estBloque) {
      return Response.json(
        { success: false, message: "Accès refusé à cette conversation." },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { auteur: true },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/messages :", error);
    return Response.json(
      { success: false, message: "Impossible de récupérer les messages." },
      { status: 500 }
    );
  }
}

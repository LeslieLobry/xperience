import { prisma } from "../../../lib/prisma";
import { resend } from "../../../lib/resend";

export async function POST(req) {
  console.log("⇒ POST /api/messages déclenché");

  try {
    const body = await req.json();
    const { conversationId, auteurId, contenu, imageUrl, videoUrl, type } = body;

    if (!conversationId || !auteurId || (!contenu && !imageUrl && !videoUrl)) {
      return Response.json(
        { success: false, message: "Champs manquants" },
        { status: 400 }
      );
    }

    // Création du message (lu = false par défaut)
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

    // Création des notifications pour tous les participants sauf l'auteur
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });

    const destinataires = participants
      .map(p => p.utilisateurId)
      .filter(id => id !== auteurId);

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

    // Envoi d’e-mail en tâche de fond
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

        const fromAddress = process.env.EMAIL_FROM || "no-reply@votredomaine.com";
        const expediteurNom = auteur.pseudo || "Utilisateur";
        const destinataireNom = destinataire.pseudo || "Utilisateur";
        const messageUrl = `https://votredomaine.com/messages/${message.id}`;

        await resend.emails.send({
          from: fromAddress,
          to: destinataire.email,
          subject: `[VotreApp] Nouveau message de ${expediteurNom}`,
          html: `
            <p>Bonjour ${destinataireNom},</p>
            <p>Vous avez reçu un nouveau message de <strong>${expediteurNom}</strong> :</p>
            <blockquote style="padding:10px;background:#f5f5f5;border-left:4px solid #ccc;">
              ${extrait}…
            </blockquote>
            <p><a href="${messageUrl}" style="display:inline-block;padding:10px 20px;background:#0070f3;color:#fff;
                  text-decoration:none;border-radius:4px;">
                 Voir le message complet
               </a>
            </p>
            <hr>
            <p>Si vous ne souhaitez plus recevoir d’e-mails, <a href="https://votredomaine.com/settings/notifications">cliquez ici</a>.</p>
            <p>Cordialement,<br>L’équipe VotreApp</p>
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

    if (!conversationId) {
      return Response.json(
        { success: false, message: "conversationId requis" },
        { status: 400 }
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

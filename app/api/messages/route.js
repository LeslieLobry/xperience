// /app/api/messages/route.js
import { prisma } from "../../../lib/prisma";
import { resend } from "../../../lib/resend";

export async function POST(req) {
  console.log("⇒ POST /api/messages déclenché"); // ①

  try {
    const body = await req.json();
    console.log("① Body reçu :", body);

    const { conversationId, auteurId, contenu, imageUrl, videoUrl, type } = body;

    if (!conversationId || !auteurId || (!contenu && !imageUrl && !videoUrl)) {
      console.log("② Champs manquants :", { conversationId, auteurId, contenu, imageUrl, videoUrl });
      return Response.json(
        { success: false, message: "Champs manquants" },
        { status: 400 }
      );
    }
    console.log("③ Données valides, on crée le message en BDD…");

    // Création du message
    const message = await prisma.message.create({
      data: {
        conversationId,
        auteurId,
        contenu,
        imageUrl,
        videoUrl,
        type,
      },
      include: { auteur: true },
    });
    console.log("④ Message créé (ID =", message.id, "), auteur :", message.auteur.pseudo);

    // Mise à jour de la conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    console.log("⑤ Conversation mise à jour (updatedAt).");

    // Envoi d’e-mail en tâche de fond
    (async () => {
      console.log("⑥ IIFE e-mail démarrée pour le message ID =", message.id);

      try {
        // a) Récupérer les participants
        const participants = await prisma.participant.findMany({
          where: { conversationId },
          include: { utilisateur: true },
        });
        console.log("⑦ Participants trouvés :", participants.length);

        // b) Trouver l’autre participant
        const destinataireEntry = participants.find(p => p.utilisateurId !== auteurId);
        if (!destinataireEntry) {
          console.log("⑧ Aucun destinataire (conversation solo). On stoppe l’IIFE.");
          return;
        }
        const destinataire = destinataireEntry.utilisateur;
        console.log("⑨ Destinataire :", destinataire.email, "– Statut :", destinataire.statut);

        // Si le destinataire est connecté, on n’envoie pas l’e-mail
        if (destinataire.statut === "en_ligne") {
          console.log("Destinataire actuellement connecté → pas d’envoi d’e-mail.");
          return;
        }

        if (!destinataire.email) {
          console.log("⑩ Destinataire sans e-mail, on ne peut pas envoyer.");
          return;
        }

        // c) Construire l’extrait du message
        const rawTexte = contenu || "";
        const extrait = rawTexte
          .substring(0, 100)
          .replace(/\n/g, "<br>")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        console.log("⑪ Extrait généré :", extrait);

        // d) Préparer l’e-mail
        const fromAddress = process.env.EMAIL_FROM || "no-reply@votredomaine.com";
        const expediteurNom = message.auteur.pseudo || "Utilisateur";
        const destinataireNom = destinataire.pseudo || "Utilisateur";
        const messageUrl = `https://votredomaine.com/messages/${message.id}`;

        console.log("⑫ Appel à resend.emails.send() de", fromAddress, "à", destinataire.email);

        const response = await resend.emails.send({
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

        console.log("⑬ E-mail envoyé, ID Resend :", response.id);
      } catch (err) {
        console.error("⑭ Erreur IIFE e-mail :", err);
      }
    })();

    console.log("⑮ Retour de POST avec succès");
    return Response.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error("⑯ Erreur dans POST /api/messages :", error);
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
      console.log("GET : conversationId manquant dans les query params");
      return Response.json(
        { success: false, message: "conversationId requis" },
        { status: 400 }
      );
    }

    // Récupérer tous les messages pour cette conversation,
    // triés par date croissante, avec auteur inclus
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { auteur: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`GET : ${messages.length} message(s) trouvés pour conversationId=${conversationId}`);

    return Response.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/messages :", error);
    return Response.json(
      { success: false, message: "Impossible de récupérer les messages." },
      { status: 500 }
    );
  }
}

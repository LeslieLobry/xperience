// app/api/admin/broadcast/route.js
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { resend } from "../../../../lib/resend"; 

export async function POST(req) {
  const user = await getUserFromToken();
  if (user?.role !== "ADMIN") {
  return Response.json({ error: "Non autorisé" }, { status: 403 });
}

  const { objet, message } = await req.json();
  if (!objet || !message) {
    return Response.json({ error: "Champ manquant" }, { status: 400 });
  }

  // Sélectionne tous les emails valides (modifie si tu veux les non confirmés)
  const utilisateurs = await prisma.utilisateur.findMany({
    where: { emailConfirme: true },
    select: { email: true },
  });

  // Option 1: envoi séquentiel simple
  for (const u of utilisateurs) {
    try {
      const messageWithLogo = `
  ${message}
  <div style="margin-top:32px;text-align:center;">
    <img src="https://x-periences.fr/logo.png" alt="Logo X-periences" style="height:42px;opacity:.92;" />
  </div>
`;

await resend.emails.send({
  to: u.email,
  subject: objet,
  html: messageWithLogo,
  from: "noreply@xperience.fr",
});

    } catch (e) {
      // Logguer mais ne bloque pas l'envoi aux autres
      console.error(`Erreur pour ${u.email}:`, e);
    }
  }

  // Option 2: pour beaucoup d’utilisateurs, tu peux batcher ou lancer en parallèle

  return Response.json({ success: true });
}

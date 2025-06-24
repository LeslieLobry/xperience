import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export async function DELETE(req, { params }) {
  const user = await getUserFromToken();
  if (!user) {
    return new Response("Non autorisé", { status: 401 });
  }

  const messageId = parseInt(params.id);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.auteurId !== user.id) {
    return new Response("Interdit", { status: 403 });
  }

  await prisma.message.delete({ where: { id: messageId } });

  return new Response("Message supprimé", { status: 200 });
}

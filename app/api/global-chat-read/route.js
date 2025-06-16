import { prisma } from "../../../lib/prisma";

export async function PATCH(req) {
 
  const { userId } = await req.json();

  if (!userId) {
    return new Response(JSON.stringify({ error: "userId requis" }), { status: 400 });
  }

  await prisma.globalChatRead.upsert({
    where: { userId },
    update: { lastRead: new Date() },
    create: { userId, lastRead: new Date() },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

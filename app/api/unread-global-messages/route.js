import { prisma } from "../../../lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = parseInt(searchParams.get("userId"));

  if (!userId) {
    return new Response(JSON.stringify({ error: "userId requis" }), { status: 400 });
  }

  const lastRead = await prisma.globalChatRead.findUnique({
    where: { userId },
  });

  const since = lastRead?.lastRead || new Date(0);

  const count = await prisma.globalMessage.count({
    where: {
      auteurId: { not: userId },
      createdAt: { gt: since },
    },
  });

  return new Response(JSON.stringify({ unreadGlobal: count }), {
    headers: { "Content-Type": "application/json" },
  });
}
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

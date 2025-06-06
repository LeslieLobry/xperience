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

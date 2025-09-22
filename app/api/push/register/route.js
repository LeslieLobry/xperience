import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export async function POST(req) {
  const me = await getUserFromToken();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { expoPushToken } = await req.json();
  if (!expoPushToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await prisma.utilisateur.update({
    where: { id: me.id },
    data: { expoPushToken },
  });

  return NextResponse.json({ ok: true });
}

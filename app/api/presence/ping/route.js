import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    await prisma.utilisateur.update({
      where: { id: Number(user.id) },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

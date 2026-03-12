import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import { getUserFromToken } from "../../../../lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromToken(cookieStore);

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
    }

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[presence/offline] error:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
// app/api/push/register/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req) {
  try {
    const { userId, token } = await req.json();
    if (!userId || !token) {
      return NextResponse.json({ ok: false, error: "userId et token requis" }, { status: 400 });
    }

    await prisma.utilisateur.update({
      where: { id: Number(userId) },
      data: {
        expoPushToken: token,         // ✅ juste la string
        // ou: expoPushToken: { set: token },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

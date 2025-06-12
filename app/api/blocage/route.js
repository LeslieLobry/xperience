import { cookies } from "next/headers";
import { getUserFromToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);
  const { bloquéId } = await req.json();

  if (!user || !user.id || !bloquéId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    await prisma.blocage.create({
      data: {
        bloqueurId: user.id,
        bloquéId: bloquéId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Blocage déjà existant ou erreur" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore); 
  const { bloquéId } = await req.json();

  if (!user || !user.id || !bloquéId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    await prisma.blocage.delete({
      where: {
        bloqueurId_bloquéId: {
          bloqueurId: user.id,
          bloquéId: bloquéId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Blocage introuvable ou erreur" }, { status: 500 });
  }
}

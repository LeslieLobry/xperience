import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const blocages = await prisma.blocage.findMany({
    where: { bloqueurId: user.id },
    include: {
      bloque: {
        select: {
          id: true,
          pseudo: true,
          photoUrl: true,
          age: true,
          localisation: true,
        },
      },
    },
  });

  return NextResponse.json({ blocages });
}

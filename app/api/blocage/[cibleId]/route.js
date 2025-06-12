import { cookies } from "next/headers";
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const cookieStore = cookies();
  const user = getUserFromToken(cookieStore);
  const cibleId = parseInt(params.cibleId);

  if (!user || !user.id || !cibleId) {
    return NextResponse.json({ estBloqué: false }, { status: 401 });
  }

  const blocage = await prisma.blocage.findUnique({
    where: {
      bloqueurId_bloquéId: {
        bloqueurId: user.id,
        bloquéId: cibleId,
      },
    },
  });

  return NextResponse.json({ estBloqué: !!blocage });
}

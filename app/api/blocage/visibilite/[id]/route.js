import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";

export async function GET(req, context) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  const cibleId = parseInt(context.params.id, 10);

  if (!user || !user.id || isNaN(cibleId)) {
    return NextResponse.json({ canSee: false }, { status: 401 });
  }

  if (user.id === cibleId) {
    return NextResponse.json({ canSee: true });
  }

  const blocage = await prisma.blocage.findFirst({
    where: {
      OR: [
        { bloqueurId: user.id, bloquéId: cibleId },
        { bloqueurId: cibleId, bloquéId: user.id },
      ],
    },
  });

  return NextResponse.json({ canSee: !blocage });
}

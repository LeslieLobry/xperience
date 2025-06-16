// /app/api/conversations/[id]/participants/route.js
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const conversationId = parseInt(params.id, 10);

  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { utilisateurId: true, lastReadAt: true },
  });

  return NextResponse.json({ participants });
}

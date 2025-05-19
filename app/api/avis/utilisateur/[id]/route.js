import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const avis = await prisma.avis.findMany({
    where: { cibleId: parseInt(id) },
    include: {
      auteur: {
        select: {
          id: true,
          pseudo: true,
          photoUrl: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ avis });
}

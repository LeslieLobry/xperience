import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

// Bonne pratique : instance Prisma globale en dev (évite les bugs Hot Reload Next.js)
let prisma;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export async function GET(req, context) {
  const { params } = await context; 


  if (!params?.id) {
    
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const cibleId = parseInt(params.id, 10);
  if (isNaN(cibleId)) {
    
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    const avis = await prisma.avis.findMany({
      where: { cibleId },
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Debug : affichage du résultat
    console.log(`API avis - ${avis.length} avis trouvés pour cibleId=${cibleId}`);

    return NextResponse.json({ avis });
  } catch (error) {
    console.error("Erreur dans API avis :", error, error?.message, error?.stack);
    return NextResponse.json(
      { error: "Erreur serveur", details: error?.message },
      { status: 500 }
    );
  }
}

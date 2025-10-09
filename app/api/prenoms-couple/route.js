// /api/prenoms-couple/route.ts
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";
import { NextResponse } from "next/server";

function bad(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

async function parseBody(req: Request) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  // JSON
  if (ct.includes("application/json")) return await req.json();

  // multipart
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return {
      conversationId: fd.get("conversationId"),
      prenom1: fd.get("prenom1"),
      prenom2: fd.get("prenom2"),
    };
  }

  // x-www-form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const p = new URLSearchParams(text);
    return {
      conversationId: p.get("conversationId"),
      prenom1: p.get("prenom1"),
      prenom2: p.get("prenom2"),
    };
  }

  // fallbacks
  try { return await req.json(); } catch {}
  try {
    const fd = await req.formData();
    return {
      conversationId: fd.get("conversationId"),
      prenom1: fd.get("prenom1"),
      prenom2: fd.get("prenom2"),
    };
  } catch {}
  return {};
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = Number(searchParams.get("conversationId"));
    if (!Number.isFinite(conversationId)) return bad(400, "conversationId invalide");

    const user = await getUserFromToken();
    if (!user) return bad(401, "Non autorisé.");

    const record = await prisma.prenomCoupleConversation.findUnique({
      where: {
        conversationId_utilisateurId: {
          conversationId,
          utilisateurId: user.id,
        },
      },
    });

    return NextResponse.json({ success: true, prenoms: record || null }, { status: 200 });
  } catch (err: any) {
    console.error("Erreur GET /api/prenoms-couple:", err?.message, err);
    return bad(500, "Erreur serveur");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return bad(401, "Non autorisé.");

    const body = await parseBody(req);
    const convId = Number((body as any).conversationId);
    if (!Number.isFinite(convId)) return bad(422, "conversationId requis (number)");

    // Normalisation des entrées
    const rawP1 = (typeof (body as any).prenom1 === "string" ? (body as any).prenom1 : "").trim();
    const rawP2 = (typeof (body as any).prenom2 === "string" ? (body as any).prenom2 : "").trim();
    const hasP1 = rawP1.length > 0;
    const hasP2 = rawP2.length > 0;

    // Existe déjà ?
    const existing = await prisma.prenomCoupleConversation.findUnique({
      where: {
        conversationId_utilisateurId: {
          conversationId: convId,
          utilisateurId: user.id,
        },
      },
      select: { prenom1: true, prenom2: true },
    });

    if (!existing) {
      // CREATE : les deux prénoms sont obligatoires (modèle non-nullable)
      if (!hasP1 || !hasP2) {
        return bad(422, "prenom1 et prenom2 sont requis pour l'initialisation");
      }
      const record = await prisma.prenomCoupleConversation.create({
        data: {
          conversationId: convId,
          utilisateurId: user.id,
          prenom1: rawP1,
          prenom2: rawP2,
        },
      });
      return NextResponse.json({ success: true, prenoms: record }, { status: 200 });
    }

    // UPDATE : on peut n’en changer qu’un seul, on garde l’autre
    const nextPrenom1 = hasP1 ? rawP1 : existing.prenom1;
    const nextPrenom2 = hasP2 ? rawP2 : existing.prenom2;

    // Double garde-fou (toujours non-vide)
    if (!nextPrenom1 || !nextPrenom2) {
      return bad(422, "Les prénoms ne peuvent pas être vides");
    }

    const record = await prisma.prenomCoupleConversation.update({
      where: {
        conversationId_utilisateurId: {
          conversationId: convId,
          utilisateurId: user.id,
        },
      },
      data: {
        prenom1: nextPrenom1,
        prenom2: nextPrenom2,
      },
    });

    return NextResponse.json({ success: true, prenoms: record }, { status: 200 });
  } catch (err: any) {
    console.error("Erreur POST /api/prenoms-couple:", err?.message, err);
    return bad(500, "Erreur serveur");
  }
}

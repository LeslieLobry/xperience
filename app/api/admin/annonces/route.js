// app/api/admin/annonces/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET() {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

  const annonces = await prisma.annonce.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: annonces });
}

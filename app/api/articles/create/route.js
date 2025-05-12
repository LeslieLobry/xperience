import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export async function POST(req) {
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
   
  if (!token) return NextResponse.json({ success: false }, { status: 401 });

  let decoded;
try {
  decoded = jwt.verify(token, secret);
  console.log("✅ decoded JWT:", decoded); // ← ça, c'est pour diagnostiquer
} catch {
  return NextResponse.json({ success: false }, { status: 403 });
}


  if (decoded.role !== "ADMIN") {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const { titre, contenu } = await req.json();
  const slug = titre.toLowerCase().replace(/\s+/g, "-");

  const article = await prisma.article.create({
    data: {
      titre,
      contenu,
      slug,
      auteurId: decoded.id,
    },
  });

  return NextResponse.json({ success: true, article });
}

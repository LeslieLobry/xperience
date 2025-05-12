import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export async function PUT(req, { params }) {
  const { id } = params;
  const token = cookies().get("token")?.value;
  if (!token) return NextResponse.json({ success: false }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  if (decoded.role !== "ADMIN") {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const { titre, contenu } = await req.json();

  const updated = await prisma.article.update({
    where: { id },
    data: { titre, contenu },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const token = cookies().get("token")?.value;
  if (!token) return NextResponse.json({ success: false }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  if (decoded.role !== "ADMIN") {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  await prisma.article.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

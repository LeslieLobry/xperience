import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const { email, password } = await req.json();
  const user = await prisma.utilisateur.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ success: false, message: "Identifiants invalides" }, { status: 401 });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });

  const isMobile = req.headers.get("x-platform") === "mobile" || new URL(req.url).searchParams.get("mobile") === "1";

  const res = NextResponse.json(
    isMobile ? { success: true, token, user: { id: user.id, email: user.email } } : { success: true }
  );

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

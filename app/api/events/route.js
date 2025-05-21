import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = (await cookieStore)?.get("token")?.value;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const filters = {};
  if (searchParams.get("type")) filters.type = searchParams.get("type");
  if (searchParams.get("acces")) filters.acces = searchParams.get("acces");
  if (searchParams.get("lieu")) {
    filters.lieu = { contains: searchParams.get("lieu"), mode: "insensitive" };
  }

  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "10");
  const skip = (page - 1) * perPage;

  const [events, total] = await prisma.$transaction([
    prisma.evenement.findMany({
      where: filters,
      orderBy: { date: "asc" },
      skip,
      take: perPage,
    }),
    prisma.evenement.count({ where: filters }),
  ]);

  const user = await getUserFromCookie();
  const isAdmin = user?.role === "ADMIN";

  return NextResponse.json({ events, total, page, perPage, isAdmin });
}
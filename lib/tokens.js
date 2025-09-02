import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "./prisma";

const ACCESS_TTL = "15m";
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

export function genRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

// On stocke seulement un hash du refresh côté DB (si vol BDD → inutilisable)
export async function saveRefreshToken(userId, deviceId, refreshToken) {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const now = new Date();
  const exp = new Date(now.getTime() + REFRESH_TTL_MS);

  await prisma.refreshToken.upsert({
    where: { userId_deviceId: { userId, deviceId } },
    create: { userId, deviceId, tokenHash: hash, expiresAt: exp },
    update: { tokenHash: hash, expiresAt: exp },
  });
}

export async function rotateRefreshToken(userId, deviceId) {
  const newToken = genRefreshToken();
  await saveRefreshToken(userId, deviceId, newToken);
  return newToken;
}

export async function validateRefreshToken(userId, deviceId, refreshToken) {
  const rec = await prisma.refreshToken.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
  });
  if (!rec) return false;
  if (rec.expiresAt < new Date()) return false;
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(rec.tokenHash));
}

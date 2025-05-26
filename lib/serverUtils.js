import { cookies as getCookies } from "next/headers";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

export function safeParam(context, key) {
  return context?.params?.[key] || null;
}

export function getToken() {
  return getCookies().get("token")?.value || null;
}

export function getUserFromToken() {
  const token = getToken();
  if (!token || !secret) return null;

  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

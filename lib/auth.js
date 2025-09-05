// lib/auth.js (server-only, rétro-compatible)
import jwt from "jsonwebtoken";
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER;    // optionnel (ex: "xperiences")
const JWT_AUDIENCE = process.env.JWT_AUDIENCE; // optionnel (ex: "xperiences:web")
const CLOCK_SKEW_SEC = 5; // tolérance légère

if (!SECRET) console.warn("⚠️ JWT_SECRET manquant");

// --- Helpers internes --------------------------------------------------------

function readAccessTokenFromHeadersLike(hdrs) {
  if (!hdrs) return null;
  const auth = hdrs.get?.("authorization") || hdrs.Authorization || "";
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

function readCookieTokenFromHeadersLike(hdrs) {
  // lecture manuelle d'un cookie "token" si on reçoit un Request
  const cookieHeader = hdrs?.get?.("cookie") || "";
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

function verifyJwtSafe(token) {
  // Si tu veux renforcer, ajoute {issuer: JWT_ISSUER, audience: JWT_AUDIENCE}
  const opts = {
    algorithms: ["HS256"],
    clockTolerance: CLOCK_SKEW_SEC,
    ...(JWT_ISSUER ? { issuer: JWT_ISSUER } : {}),
    ...(JWT_AUDIENCE ? { audience: JWT_AUDIENCE } : {}),
  };
  return jwt.verify(token, SECRET, opts);
}

// --- API publique ------------------------------------------------------------

/**
 * Récupère l'ID utilisateur depuis le token JWT **sans toucher la base**.
 * @param {object} [opts] - { req?: Request, allowCookie?: boolean }
 * @returns {number|null}
 */
export function getUserIdFromToken(opts = {}) {
  let token = null;

  // 1) Authorization: Bearer (prioritaire pour mobile / API)
  if (opts?.req?.headers) {
    token = readAccessTokenFromHeadersLike(opts.req.headers);
  } else {
    token = readAccessTokenFromHeadersLike(nextHeaders());
  }

  // 2) Cookie "token" (web)
  if (!token && opts?.allowCookie !== false) {
    if (opts?.req?.headers) {
      token = readCookieTokenFromHeadersLike(opts.req.headers);
    } else {
      token = nextCookies().get("token")?.value || null;
    }
  }

  if (!token) return null;

  try {
    const decoded = verifyJwtSafe(token);
    const id = Number(decoded?.id);
    return Number.isFinite(id) ? id : null;
  } catch (err) {
    // Erreurs attendues: TokenExpiredError, JsonWebTokenError, NotBeforeError
    if (process.env.NODE_ENV !== "production") {
      console.warn("JWT invalid/expired in getUserIdFromToken:", err?.name || err);
    }
    return null;
  }
}

/**
 * Version **rétro-compatible** : signature inchangée.
 * getUserFromToken([opts]) → si appelé sans argument, conserve ton comportement initial,
 * sinon permet d'overrider la sélection Prisma.
 *
 * @param {object} [opts] - { req?: Request, select?: Prisma.UtilisateurSelect, include?: Prisma.UtilisateurInclude }
 * @returns {Promise<object|null>}
 */
export async function getUserFromToken(opts = undefined) {
  const hasOpts = !!opts && typeof opts === "object";
  const req = hasOpts ? opts.req : undefined;

  // Récupère l'ID depuis le JWT
  const userId = getUserIdFromToken({ req, allowCookie: true });
  if (!userId) return null;

  // Sélection/Include :
  // - par défaut on garde ton include initial pour rétro-compatibilité
  // - si opts.select/opts.include fournis, on les utilise
  const defaultInclude = { recherches: true, envies: true };
  const prismaArgs = hasOpts
    ? (opts.select ? { select: opts.select } :
       opts.include ? { include: opts.include } :
       { include: defaultInclude })
    : { include: defaultInclude };

  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      ...prismaArgs,
    });
    if (!user) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("❌ Aucun utilisateur avec cet ID :", userId);
      }
      return null;
    }
    return user;
  } catch (err) {
    console.error("❌ getUserFromToken → erreur Prisma :", err);
    return null;
  }
}

/**
 * Petit utilitaire si tu veux strictement échouer (throw) côté route.
 * @param {object} [opts]
 */
export async function requireUser(opts = undefined) {
  const user = await getUserFromToken(opts);
  if (!user) {
    const e = new Error("Unauthorized");
    e.status = 401;
    throw e;
  }
  return user;
}

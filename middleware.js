// middleware.js
import { NextResponse } from "next/server";

const PROTECTED_PATHS = [
  "/evenements",
  "/messagerie",
  "/profil",
  "/admin",
  "/blog/editer",
  "/evenements/creer",
  "/evenements/modifier",
  // Ajoute ici toutes les pages qui doivent être protégées
];

export function middleware(request) {
  const url = request.nextUrl.clone();
  const token = request.cookies.get("token")?.value;
  const isProtected = PROTECTED_PATHS.some((path) =>
    url.pathname.startsWith(path)
  );
  if (isProtected && !token) { 
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/evenements/creer") ||
    url.pathname.startsWith("/evenements/modifier")
  ) {
   
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/evenements/:path*",
    "/messagerie/:path*",
    "/profil/:path*",
    "/admin/:path*",
    "/blog/editer/:path*",
    // etc.
  ],
};

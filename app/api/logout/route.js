import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // 🛠 Force la suppression du cookie local, même sans HTTPS
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: false, // ⛔ obligatoire pour que ça fonctionne en local
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

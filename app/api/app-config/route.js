// app/api/app-config/route.js
import { NextResponse } from "next/server";

// (optionnel) pour que ce soit toujours recalculé côté serveur
export const dynamic = "force-dynamic";

// 🔧 Tu modifies juste ces valeurs quand tu veux forcer une mise à jour
const CONFIG = {
  minVersionAndroid: "1.0.3", // ✅ version minimale Android
  minVersionIos: "1.0.1",     // ✅ version minimale iOS

  // ✅ liens vers tes stores (À REMPLACER par les bons)
  storeUrlAndroid:
    "https://play.google.com/store/apps/details?id=fr.xperiences.app&hl=fr",
  storeUrlIos:
    "https://apps.apple.com/app/id1234567890",

  forceUpdateMessage:
    "Une nouvelle version d’X-periences est disponible. Mettez à jour l’application pour continuer à l’utiliser dans les meilleures conditions."
};

export async function GET() {
  return NextResponse.json(CONFIG);
}

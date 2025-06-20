import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getCoordsFromVille(ville) {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville)}&fields=centre&limit=1`
    );
    const data = await res.json();
    if (data.length > 0 && data[0].centre?.coordinates) {
      const [lng, lat] = data[0].centre.coordinates;
      return { latitude: lat, longitude: lng };
    }
  } catch (e) {
    console.error("Erreur API geo pour :", ville, e);
  }
  return null;
}

async function updateAllUsers() {
  const { data: users, error } = await supabase
    .from("Utilisateur")
    .select("id, localisation")
    .is("latitude", null)
    .limit(1000);

  if (error) {
    console.error("❌ Erreur récupération utilisateurs :", error);
    return;
  }

  for (const user of users) {
    if (!user.localisation) continue;

    const coords = await getCoordsFromVille(user.localisation);
    if (!coords) {
      console.warn(`⚠️ Coordonnées non trouvées pour : ${user.localisation}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("Utilisateur")
      .update({
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(`❌ Erreur mise à jour utilisateur ${user.id} :`, updateError);
    } else {
      console.log(`✅ ${user.localisation} => ${coords.latitude}, ${coords.longitude}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("🎉 Mise à jour terminée !");
}

updateAllUsers();

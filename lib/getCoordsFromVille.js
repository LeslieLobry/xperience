export async function getCoordsFromVille(ville) {
  const res = await fetch(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville)}&fields=centre&boost=population&limit=1`
  );
  const data = await res.json();
  if (data.length > 0 && data[0].centre?.coordinates) {
    const [lng, lat] = data[0].centre.coordinates;
    return { latitude: lat, longitude: lng };
  }
  return null;
}

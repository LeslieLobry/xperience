export async function analyzeImageWithSightengineFromFile(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const formData = new FormData();
  formData.append("media", new Blob([buffer], { type: file.type }), file.name);
  formData.append("models", "face-attributes");
  formData.append("api_user", process.env.SIGHTENGINE_USER);
  formData.append("api_secret", process.env.SIGHTENGINE_SECRET);

  const response = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Sightengine error:", errorText);
    throw new Error("Erreur lors de l'analyse Sightengine");
  }

  const data = await response.json();
  const face = data.faces?.[0];

  if (!face) {
    return { isAdult: false, age: null, gender: null, raw: data };
  }

  // On récupère l'âge et le genre, s'ils existent
  const age = face.age ?? null;
  const gender = face.gender ?? null;
  const minorProb = face.attributes?.minor ?? 0;

  // Considérer adulte si la probabilité d'être mineur est faible (<0.8)
  const isAdult = minorProb < 0.8;

  return {
    isAdult,
    age,
    gender,
    raw: data,
  };
}

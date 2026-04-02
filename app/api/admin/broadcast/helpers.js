export function normalizeBroadcastPayload(body = {}) {
  return {
    subject: String(body.subject || "").trim(),
    preheader: String(body.preheader || "").trim(),
    title: String(body.title || "").trim(),
    intro: String(body.intro || "").trim(),
    message: String(body.message || "").trim(),
    ctaLabel: String(body.ctaLabel || "").trim(),
    ctaUrl: String(body.ctaUrl || "").trim(),
    signature: String(body.signature || "").trim(),
  };
}

export function validateBroadcastPayload(payload) {
  if (!payload.subject) {
    return "L’objet est obligatoire.";
  }

  if (!payload.message) {
    return "Le message est obligatoire.";
  }

  if ((payload.ctaLabel && !payload.ctaUrl) || (!payload.ctaLabel && payload.ctaUrl)) {
    return "Le bouton nécessite à la fois un texte et un lien.";
  }

  if (payload.ctaUrl) {
    const valid =
      payload.ctaUrl.startsWith("https://") ||
      payload.ctaUrl.startsWith("http://") ||
      payload.ctaUrl.startsWith("mailto:");

    if (!valid) {
      return "Le lien du bouton doit commencer par https://, http:// ou mailto:.";
    }
  }

  return null;
}
const LOGO_URL = "https://x-periences.fr/logo.png";

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(str = "") {
  return String(str).replace(/\n/g, "<br />");
}

function paragraphize(text = "", color = "#f6f6fb", size = 16) {
  const safe = escapeHtml(text).trim();

  if (!safe) return "";

  const blocks = safe
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map(
      (block) => `
        <p style="margin:0 0 16px 0;color:${color};font-size:${size}px;line-height:1.7;">
          ${nl2br(block)}
        </p>
      `
    )
    .join("");
}

function sanitizeUrl(url = "") {
  const value = String(url).trim();
  if (!value) return "";

  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("mailto:")
  ) {
    return value;
  }

  return "";
}

export function buildBroadcastEmail({
  subject = "",
  preheader = "",
  title = "",
  intro = "",
  message = "",
  ctaLabel = "",
  ctaUrl = "",
  signature = "L’équipe Xperiences",
  footerNote = "Cet email vous a été envoyé par Xperiences.",
}) {
  const safeSubject = escapeHtml(subject || "Actualités Xperiences");
  const safePreheader = escapeHtml(preheader || "");
  const safeTitle = escapeHtml(title || subject || "Actualités Xperiences");
  const safeSignature = escapeHtml(signature || "L’équipe Xperiences");
  const safeFooterNote = escapeHtml(
    footerNote || "Cet email vous a été envoyé par Xperiences."
  );

  const introHtml = paragraphize(intro, "#d7ddf5", 15);
  const messageHtml =
    paragraphize(message, "#f6f6fb", 16) ||
    `<p style="margin:0;color:#a7adc8;font-size:16px;line-height:1.7;">(Votre message ici)</p>`;

  const safeCtaLabel = escapeHtml(ctaLabel || "");
  const safeCtaUrl = sanitizeUrl(ctaUrl);

  const ctaHtml =
    safeCtaLabel && safeCtaUrl
      ? `
      <tr>
        <td style="padding:8px 32px 8px 32px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
            <tr>
              <td align="center" bgcolor="#e0c084" style="border-radius:10px;">
                <a
                  href="${safeCtaUrl}"
                  target="_blank"
                  style="
                    display:inline-block;
                    padding:14px 22px;
                    font-size:15px;
                    font-weight:700;
                    color:#112347;
                    text-decoration:none;
                    border-radius:10px;
                  "
                >
                  ${safeCtaLabel}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `
      : "";

  return `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#181f32;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${safePreheader}
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="width:100%;border-collapse:collapse;background-color:#181f32;margin:0;padding:0;"
    >
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="width:100%;max-width:640px;border-collapse:separate;background-color:#232f47;border:1px solid #2d3a60;border-radius:18px;overflow:hidden;"
          >
            <tr>
              <td
                align="center"
                style="padding:30px 32px 12px 32px;background:linear-gradient(180deg,#232f47 0%,#1d2740 100%);"
              >
                <img
                  src="${LOGO_URL}"
                  alt="Xperiences"
                  width="150"
                  style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:150px;margin:0 auto 10px auto;"
                />
              </td>
            </tr>

            <tr>
              <td style="padding:8px 32px 6px 32px;">
                <h1
                  style="
                    margin:0;
                    color:#e0c084;
                    font-size:28px;
                    line-height:1.25;
                    font-weight:700;
                  "
                >
                  ${safeTitle}
                </h1>
              </td>
            </tr>

            ${
              introHtml
                ? `
            <tr>
              <td style="padding:10px 32px 4px 32px;">
                ${introHtml}
              </td>
            </tr>
            `
                : ""
            }

            <tr>
              <td style="padding:10px 32px 10px 32px;">
                ${messageHtml}
              </td>
            </tr>

            ${ctaHtml}

            <tr>
              <td style="padding:18px 32px 10px 32px;">
                <p style="margin:0;color:#f6f6fb;font-size:15px;line-height:1.7;">
                  ${safeSignature}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 30px 32px;">
                <div style="height:1px;background:#324166;width:100%;margin:0 0 18px 0;"></div>
                <p style="margin:0 0 6px 0;color:#a7adc8;font-size:13px;line-height:1.6;text-align:center;">
                  ${safeFooterNote}
                </p>
                <p style="margin:0;color:#7f88ac;font-size:12px;line-height:1.6;text-align:center;">
                  © Xperiences
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
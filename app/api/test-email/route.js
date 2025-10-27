export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "../../../lib/resend";

export async function POST(req) {
  try {
    const { to = "leslielobry@gmail.com" } = await req.json().catch(() => ({}));

    const result = await resend.emails.send({
      from: `Xperiences <${FROM_EMAIL}>`,
      to, // string ou array
      subject: "Test Resend (prod)",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif">
          <h1>Ça marche ✅</h1>
          <p>Email envoyé via Resend depuis la prod.</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log("[resend] success:", result?.data || result);
    return NextResponse.json({ ok: true, id: result?.data?.id || result?.id || null });
  } catch (error) {
    console.error("[resend] error:", error);
    const message = error?.message || "Erreur d'envoi";
    const cause = error?.cause || error?.name || null;
    return NextResponse.json({ ok: false, message, cause }, { status: 500 });
  }
}

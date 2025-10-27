export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // pas de cache
import { NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "../../../lib/resend";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = body?.to || "leslielobry@gmail.com";

    const result = await resend.emails.send({
      from: `Xperiences <${FROM_EMAIL}>`,
      to,
      subject: "Test Resend (prod)",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif">
          <h1>Test Resend ✅</h1>
          <p>Horodatage: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    // Log complet dans Vercel > Functions > Logs
    console.log("[resend] raw result:", JSON.stringify(result, null, 2));

    // Si domaine non vérifié → retente avec l’adresse de démo
    if (result?.error?.name === "validation_error") {
      console.warn("[resend] FROM non vérifié, retry onboarding@resend.dev");
      const retry = await resend.emails.send({
        from: "onboarding@resend.dev",
        to,
        subject: "Test Resend (fallback)",
        html: `<p>Retry fallback OK ${new Date().toISOString()}</p>`,
      });
      console.log("[resend] fallback result:", JSON.stringify(retry, null, 2));
      if (retry?.error) {
        return NextResponse.json(
          { ok: false, error: retry.error },
          { status: 502 }
        );
      }
      return NextResponse.json({
        ok: true,
        id: retry?.data?.id || null,
        data: retry?.data || null,
        fallback: true,
      });
    }

    if (result?.error) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result?.data?.id || null,
      data: result?.data || null,
      fallback: false,
    });
  } catch (error) {
    console.error("[resend] exception:", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Erreur inconnue" },
      { status: 500 }
    );
  }
}

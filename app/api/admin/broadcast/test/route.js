import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth";
import { Resend } from "resend";
import { buildBroadcastEmail } from "../../../../../lib/emails/buildBroadcastEmail";
import {
  normalizeBroadcastPayload,
  validateBroadcastPayload,
} from "../helpers";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function isAdmin(user) {
  return user && user.role === "ADMIN";
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await request.json();
    const payload = normalizeBroadcastPayload(body);
    const validationError = validateBroadcastPayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const testEmail = String(body.testEmail || "").trim();

    if (!isValidEmail(testEmail)) {
      return NextResponse.json(
        { error: "Adresse email de test invalide." },
        { status: 400 }
      );
    }

    const html = buildBroadcastEmail(payload);

    await resend.emails.send({
      from: "Xperiences <no-reply@x-periences.fr>",
      to: testEmail,
      subject: `[TEST] ${payload.subject}`,
      html,
    });

    return NextResponse.json({
      ok: true,
      message: `Email de test envoyé à ${testEmail}.`,
    });
  } catch (error) {
    console.error("Erreur broadcast test :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'envoi du test." },
      { status: 500 }
    );
  }
}
// server-only
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[resend] RESEND_API_KEY manquante en runtime !");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@x-periences.fr";

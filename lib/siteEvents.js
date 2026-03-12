import prisma from "../lib/prisma";

export const SITE_EVENT_TYPES = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  REGISTER: "REGISTER",
  MESSAGE_SENT: "MESSAGE_SENT",
  CONVERSATION_CREATED: "CONVERSATION_CREATED",
  LIKE_SENT: "LIKE_SENT",
  PROFILE_VIEW: "PROFILE_VIEW",
  PRIVATE_GALLERY_REQUEST: "PRIVATE_GALLERY_REQUEST",
  CALL_STARTED: "CALL_STARTED",
};

const ALLOWED_TYPES = new Set(Object.values(SITE_EVENT_TYPES));

export async function logSiteEvent({ userId = null, type, metadata = null }) {
  try {
    if (!type || !ALLOWED_TYPES.has(type)) {
      console.warn("[logSiteEvent] type invalide :", type);
      return null;
    }

    const event = await prisma.siteEvent.create({
      data: {
        userId,
        type,
        metadata,
      },
    });

    return event;
  } catch (error) {
    console.error("[logSiteEvent] erreur :", error);
    return null;
  }
}
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {

    const user = await getUserFromToken();

    // sécurité admin
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // début de journée
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 7 derniers jours
    const week = new Date();
    week.setDate(week.getDate() - 7);

    // 30 derniers jours
    const month = new Date();
    month.setDate(month.getDate() - 30);

    const [
      usersTotal,
      usersToday,
      loginsToday,
      messagesToday,
      likesToday,
      visitsToday,
      galleryRequestsToday,
      conversationsToday
    ] = await Promise.all([

      prisma.utilisateur.count(),

      prisma.utilisateur.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),

      prisma.siteEvent.count({
        where: {
          type: "LOGIN_SUCCESS",
          createdAt: { gte: today }
        }
      }),

      prisma.siteEvent.count({
        where: {
          type: "MESSAGE_SENT",
          createdAt: { gte: today }
        }
      }),

      prisma.siteEvent.count({
        where: {
          type: "LIKE_SENT",
          createdAt: { gte: today }
        }
      }),

      prisma.siteEvent.count({
        where: {
          type: "PROFILE_VIEW",
          createdAt: { gte: today }
        }
      }),

      prisma.siteEvent.count({
        where: {
          type: "PRIVATE_GALLERY_REQUEST",
          createdAt: { gte: today }
        }
      }),

      prisma.siteEvent.count({
        where: {
          type: "CONVERSATION_CREATED",
          createdAt: { gte: today }
        }
      })

    ]);

    return NextResponse.json({
      users: {
        total: usersTotal,
        today: usersToday
      },

      activityToday: {
        logins: loginsToday,
        messages: messagesToday,
        likes: likesToday,
        visits: visitsToday,
        galleryRequests: galleryRequestsToday,
        conversations: conversationsToday
      }
    });

  } catch (error) {

    console.error("Erreur stats admin :", error);

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";

export const runtime = "nodejs";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLabel(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export async function GET() {
  try {
    const user = await getUserFromToken();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysStart = new Date(todayStart);
    sevenDaysStart.setDate(sevenDaysStart.getDate() - 6);

    const thirtyDaysStart = new Date(todayStart);
    thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 29);

    const [
      usersTotal,
      usersToday,
      loginsToday,
      messagesToday,
      likesToday,
      visitsToday,
      galleryRequestsToday,
      conversationsToday,
      uniqueLoginsTodayRaw,
      uniqueActiveUsersTodayRaw,
      siteEvents7d,
      users7d,
      siteEvents30dCount,
    ] = await Promise.all([
      prisma.utilisateur.count(),

      prisma.utilisateur.count({
        where: {
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.count({
        where: {
          type: "LOGIN_SUCCESS",
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.count({
        where: {
          type: "MESSAGE_SENT",
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.count({
        where: {
          type: "LIKE_SENT",
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.count({
        where: {
          type: "PROFILE_VIEW",
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.count({
        where: {
          type: "PRIVATE_GALLERY_REQUEST",
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.count({
        where: {
          type: "CONVERSATION_CREATED",
          createdAt: { gte: todayStart },
        },
      }),

      prisma.siteEvent.findMany({
        where: {
          type: "LOGIN_SUCCESS",
          userId: { not: null },
          createdAt: { gte: todayStart },
        },
        select: { userId: true },
      }),

      prisma.siteEvent.findMany({
        where: {
          userId: { not: null },
          createdAt: { gte: todayStart },
          type: {
            in: [
              "LOGIN_SUCCESS",
              "MESSAGE_SENT",
              "LIKE_SENT",
              "PROFILE_VIEW",
              "PRIVATE_GALLERY_REQUEST",
              "CONVERSATION_CREATED",
            ],
          },
        },
        select: { userId: true },
      }),

      prisma.siteEvent.findMany({
        where: {
          createdAt: { gte: sevenDaysStart },
          type: {
            in: [
              "LOGIN_SUCCESS",
              "MESSAGE_SENT",
              "LIKE_SENT",
              "PROFILE_VIEW",
              "PRIVATE_GALLERY_REQUEST",
              "CONVERSATION_CREATED",
            ],
          },
        },
        select: {
          type: true,
          createdAt: true,
        },
      }),

      prisma.utilisateur.findMany({
        where: {
          createdAt: { gte: sevenDaysStart },
        },
        select: {
          createdAt: true,
        },
      }),

      prisma.siteEvent.count({
        where: {
          createdAt: { gte: thirtyDaysStart },
        },
      }),
    ]);

    const uniqueLoginsToday = new Set(
      uniqueLoginsTodayRaw.map((item) => item.userId).filter(Boolean)
    ).size;

    const uniqueActiveUsersToday = new Set(
      uniqueActiveUsersTodayRaw.map((item) => item.userId).filter(Boolean)
    ).size;

    const historyMap = new Map();

    for (let i = 0; i < 7; i += 1) {
      const d = new Date(sevenDaysStart);
      d.setDate(sevenDaysStart.getDate() + i);

      const key = formatKey(d);

      historyMap.set(key, {
        key,
        label: formatLabel(d),
        registrations: 0,
        logins: 0,
        messages: 0,
        likes: 0,
        visits: 0,
        galleryRequests: 0,
        conversations: 0,
        total: 0,
      });
    }

    for (const u of users7d) {
      const d = new Date(u.createdAt);
      const key = formatKey(d);
      const row = historyMap.get(key);
      if (row) {
        row.registrations += 1;
      }
    }

    for (const evt of siteEvents7d) {
      const d = new Date(evt.createdAt);
      const key = formatKey(d);
      const row = historyMap.get(key);
      if (!row) continue;

      if (evt.type === "LOGIN_SUCCESS") row.logins += 1;
      if (evt.type === "MESSAGE_SENT") row.messages += 1;
      if (evt.type === "LIKE_SENT") row.likes += 1;
      if (evt.type === "PROFILE_VIEW") row.visits += 1;
      if (evt.type === "PRIVATE_GALLERY_REQUEST") row.galleryRequests += 1;
      if (evt.type === "CONVERSATION_CREATED") row.conversations += 1;
    }

    const history = Array.from(historyMap.values()).map((row) => ({
      ...row,
      total:
        row.registrations +
        row.logins +
        row.messages +
        row.likes +
        row.visits +
        row.galleryRequests +
        row.conversations,
    }));

    return NextResponse.json({
      users: {
        total: usersTotal,
        today: usersToday,
      },

      activityToday: {
        logins: loginsToday,
        uniqueLogins: uniqueLoginsToday,
        uniqueActiveUsers: uniqueActiveUsersToday,
        messages: messagesToday,
        likes: likesToday,
        visits: visitsToday,
        galleryRequests: galleryRequestsToday,
        conversations: conversationsToday,
      },

      totals30d: {
        events: siteEvents30dCount,
      },

      history7d: history,
    });
  } catch (error) {
    console.error("Erreur stats admin :", error);

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
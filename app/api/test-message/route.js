import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const message = await prisma.message.create({
      data: {
        auteurId: 1,
        conversationId: 45,
        type: "AUDIO",
        audioUrl: "https://test.com/audio.webm",
        duree: "TEST OK",
      },
    });
    console.log("Test manuel", message);
    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

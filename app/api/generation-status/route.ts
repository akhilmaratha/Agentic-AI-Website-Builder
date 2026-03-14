import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { getGenerationStatus } from "@/server/models";

// GET: Fetch user's generation usage status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ used: 0, limit: 5, plan: "free" });
    }

    await connectToDatabase();
    const status = await getGenerationStatus(session.user.email);

    return NextResponse.json(status);
  } catch (error) {
    console.error("[generation-status API] Error:", error);
    return NextResponse.json({ used: 0, limit: 5, plan: "free" });
  }
}

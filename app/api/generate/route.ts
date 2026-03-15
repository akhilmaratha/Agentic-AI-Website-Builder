import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { extractClientIp, getPlanRequestLimit, incrementRateLimit } from "@/lib/rateLimit";
import { runAgentPipeline } from "@/server/agents/orchestrator";
import { checkAndIncrementGeneration } from "@/server/models";

/**
 * POST /api/generate
 * Secure API proxy to generate an AI website.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan =
      ((session.user as Record<string, unknown> | undefined)?.plan as string | undefined) || "free";
    const userId =
      session.user?.email || req.headers.get("x-user-id") || extractClientIp(req.headers.get("x-forwarded-for"));

    const requestLimit = getPlanRequestLimit(plan, 10, 50);
    const requestRate = await incrementRateLimit({
      key: `rate_limit:${userId}`,
      limit: requestLimit,
      windowSeconds: 60,
    });
    if (!requestRate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before sending more requests." },
        { status: 429 }
      );
    }

    if (session.user?.email) {
      await connectToDatabase();
      const genCheck = await checkAndIncrementGeneration(session.user.email);
      if (!genCheck.allowed) {
        return NextResponse.json(
          {
            error: "You have reached the daily limit of 5 generations. Upgrade to Pro for unlimited usage.",
            limitReached: true,
          },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Call the actual AI generation logic
    const result = await runAgentPipeline(prompt, { skipDeployment: true });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[generate API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

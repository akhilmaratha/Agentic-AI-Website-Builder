import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { runAgentPipeline } from "@/server/agents/orchestrator";

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

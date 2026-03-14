import { NextRequest, NextResponse } from "next/server";
import { runAgentPipeline } from "@/server/agents/orchestrator";

/**
 * POST /api/agents
 * Runs the full multi-agent pipeline on a prompt.
 *
 * Body: { prompt: string, skipDeployment?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, skipDeployment } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    console.log(`[agents] Running pipeline for: "${prompt.slice(0, 80)}"`);

    const result = await runAgentPipeline(prompt, {
      skipDeployment: skipDeployment ?? true,
    });

    console.log(
      `[agents] ✓ ${Object.keys(result.files).length} files, ${result.errors.length} errors`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[agents] Pipeline error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Pipeline failed",
        files: {},
        logs: [],
        errors: [err instanceof Error ? err.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

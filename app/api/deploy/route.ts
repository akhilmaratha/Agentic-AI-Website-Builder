import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * POST /api/deploy
 * Secure API proxy to deploy a simulated project.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Deploy simulation
    return NextResponse.json({
      success: true,
      message: `Project ${projectId} deployed successfully.`,
      url: `https://${projectId}.agentic-deploy.app`
    });

  } catch (err) {
    console.error("[deploy API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

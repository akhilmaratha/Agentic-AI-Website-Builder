import { NextRequest, NextResponse } from "next/server";
import { previewService } from "@/server/services/previewService";

/**
 * POST /api/project/preview
 * Starts a preview dev server for a project.
 *
 * Body: { projectId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const result = await previewService.startPreview(projectId);

    return NextResponse.json({
      success: true,
      previewUrl: result.previewUrl,
      port: result.port,
      message: `Preview server started for ${projectId}`,
    });
  } catch (err) {
    console.error("[project/preview] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to start preview" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/project/preview
 * Lists all running preview instances.
 */
export async function GET() {
  const previews = previewService.listPreviews();
  return NextResponse.json({ previews });
}

/**
 * DELETE /api/project/preview
 * Stops a preview server.
 *
 * Body: { projectId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (projectId) {
      await previewService.stopPreview(projectId);
    } else {
      await previewService.stopAll();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to stop preview" },
      { status: 500 }
    );
  }
}

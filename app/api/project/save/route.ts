import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/server/services/projectService";

/**
 * POST /api/project/save
 * Saves generated files to a project workspace.
 *
 * Body: { projectId: string, files: Record<string, string> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, files } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
      return NextResponse.json({ error: "files object is required" }, { status: 400 });
    }

    const result = await projectService.saveFiles(projectId, files);

    return NextResponse.json({
      success: true,
      projectPath: result.projectPath,
      fileCount: result.fileCount,
      message: `Successfully saved ${result.fileCount} files to ${projectId}`,
    });
  } catch (err) {
    console.error("[project/save] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to save files" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/project/save?projectId=xxx
 * Lists files in a project workspace.
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      // List all projects
      const projects = await projectService.listProjects();
      return NextResponse.json({ projects });
    }

    const files = await projectService.readFiles(projectId);
    return NextResponse.json({ projectId, files, fileCount: Object.keys(files).length });
  } catch (err) {
    console.error("[project/save] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read files" },
      { status: 500 }
    );
  }
}

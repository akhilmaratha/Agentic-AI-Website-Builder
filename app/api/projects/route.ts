import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { projectService } from "@/server/services/projectService";

/**
 * GET /api/projects
 * Secure API proxy to list all projects or a specific project's files.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get("id");

    if (projectId) {
      const files = await projectService.readFiles(projectId);
      return NextResponse.json({ projectId, files });
    }

    const projects = await projectService.listProjects();
    return NextResponse.json({ projects });

  } catch (err) {
    console.error("[projects API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { Project, User, Version } from "@/server/models";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { projectId } = await params;
    const project = await Project.findOne({ _id: projectId, userId: user._id, status: "active" }).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const baseVersionId = typeof body?.baseVersionId === "string" ? body.baseVersionId : "";
    const targetVersionId = typeof body?.targetVersionId === "string" ? body.targetVersionId : "";

    if (!baseVersionId || !targetVersionId) {
      return NextResponse.json({ error: "baseVersionId and targetVersionId are required" }, { status: 400 });
    }

    const [base, target] = await Promise.all([
      Version.findOne({ _id: baseVersionId, projectId }).lean(),
      Version.findOne({ _id: targetVersionId, projectId }).lean(),
    ]);

    if (!base || !target) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const baseFiles = base.filesSnapshot || {};
    const targetFiles = target.filesSnapshot || {};

    const basePaths = new Set(Object.keys(baseFiles));
    const targetPaths = new Set(Object.keys(targetFiles));

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    for (const path of targetPaths) {
      if (!basePaths.has(path)) {
        added.push(path);
      } else if ((baseFiles[path] || "") !== (targetFiles[path] || "")) {
        changed.push(path);
      }
    }

    for (const path of basePaths) {
      if (!targetPaths.has(path)) {
        removed.push(path);
      }
    }

    return NextResponse.json({
      summary: {
        added: added.length,
        removed: removed.length,
        changed: changed.length,
      },
      files: {
        added,
        removed,
        changed,
      },
    });
  } catch (err) {
    console.error("[versions compare API] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { FileModel, Project, User, Version } from "@/server/models";

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
    const versionId = typeof body?.versionId === "string" ? body.versionId : "";
    if (!versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const version = await Version.findOne({ _id: versionId, projectId }).lean();
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    await FileModel.deleteMany({ projectId });
    const filesEntries = Object.entries(version.filesSnapshot || {});
    if (filesEntries.length) {
      await FileModel.insertMany(
        filesEntries.map(([path, content]) => ({
          projectId,
          path,
          content,
          updatedAt: new Date(),
        }))
      );
    }

    await Project.updateOne(
      { _id: projectId },
      {
        $set: {
          updatedAt: new Date(),
          previewHTML: "",
        },
      }
    );

    return NextResponse.json({ success: true, files: version.filesSnapshot || {} });
  } catch (err) {
    console.error("[versions restore API] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { ChatMessage, FileModel, Project, User } from "@/server/models";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { projectId } = await params;
    const source = await Project.findOne({ _id: projectId, userId: user._id, status: "active" }).lean();
    if (!source) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const duplicate = await Project.create({
      userId: user._id,
      name: `${source.name} Copy`,
      folderId: source.folderId ?? null,
      framework: source.framework,
      status: "active",
      previewHTML: source.previewHTML || "",
    });

    const [sourceFiles, sourceMessages] = await Promise.all([
      FileModel.find({ projectId: source._id }).lean(),
      ChatMessage.find({ projectId: source._id }).sort({ createdAt: 1 }).lean(),
    ]);

    if (sourceFiles.length) {
      await FileModel.insertMany(
        sourceFiles.map((f) => ({
          projectId: duplicate._id,
          path: f.path,
          content: f.content,
          updatedAt: new Date(),
        }))
      );
    }

    if (sourceMessages.length) {
      await ChatMessage.insertMany(
        sourceMessages.map((m) => ({
          userEmail: m.userEmail,
          projectId: duplicate._id,
          role: m.role,
          content: m.content,
          code: m.code,
          filename: m.filename,
          createdAt: new Date(),
        }))
      );
    }

    return NextResponse.json({ project: duplicate });
  } catch (err) {
    console.error("[project duplicate API] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

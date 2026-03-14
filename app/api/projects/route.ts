import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { FileModel, Project, User } from "@/server/models";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const projectId = req.nextUrl.searchParams.get("id");
    const search = req.nextUrl.searchParams.get("search")?.trim();

    if (projectId) {
      const project = await Project.findOne({
        _id: projectId,
        userId: user._id,
        status: "active",
      }).lean();

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const fileDocs = await FileModel.find({ projectId: project._id }).lean();
      const files = Object.fromEntries(fileDocs.map((f) => [f.path, f.content]));
      return NextResponse.json({ project, files });
    }

    const query: Record<string, unknown> = {
      userId: user._id,
      status: "active",
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ projects });

  } catch (err) {
    console.error("[projects API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const existingCount = await Project.countDocuments({ userId: user._id, status: "active" });
    const defaultName = `Project ${existingCount + 1}`;
    const project = await Project.create({
      userId: user._id,
      name: typeof body?.name === "string" && body.name.trim() ? body.name.trim() : defaultName,
      folderId: typeof body?.folderId === "string" ? body.folderId : null,
      framework: "nextjs",
      status: "active",
      previewHTML: "",
    });

    return NextResponse.json({
      project,
      redirectTo: `/builder?projectId=${project._id}`,
    });
  } catch (err) {
    console.error("[projects API] Create error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

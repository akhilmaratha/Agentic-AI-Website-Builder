import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { ChatMessage, FileModel, Project, User, Version } from "@/server/models";

type Params = { params: Promise<{ projectId: string }> };

async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await connectToDatabase();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) return auth.error;

    const { projectId } = await params;
    const project = await Project.findOne({
      _id: projectId,
      userId: auth.user._id,
      status: "active",
    }).lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[project API] GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { projectId } = await params;

    const update: Record<string, unknown> = {};
    if (typeof body?.name === "string") {
      const nextName = body.name.trim();
      if (nextName) update.name = nextName;
    }

    if (typeof body?.previewHTML === "string") {
      update.previewHTML = body.previewHTML;
    }

    if (typeof body?.folderId === "string") {
      update.folderId = body.folderId;
    }
    if (body?.folderId === null) {
      update.folderId = null;
    }

    const project = await Project.findOneAndUpdate(
      { _id: projectId, userId: auth.user._id, status: "active" },
      { $set: update },
      { new: true }
    ).lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[project API] PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) return auth.error;

    const { projectId } = await params;
    const project = await Project.findOne({ _id: projectId, userId: auth.user._id, status: "active" }).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await Promise.all([
      Project.updateOne({ _id: projectId }, { $set: { status: "deleted" } }),
      FileModel.deleteMany({ projectId }),
      ChatMessage.deleteMany({ projectId }),
      Version.deleteMany({ projectId }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[project API] DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { Folder, Project, User } from "@/server/models";

type Params = { params: Promise<{ folderId: string }> };

async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await connectToDatabase();
  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { folderId } = await params;

    const update: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) {
      update.name = body.name.trim();
    }
    if (typeof body?.isCollapsed === "boolean") {
      update.isCollapsed = body.isCollapsed;
    }

    const folder = await Folder.findOneAndUpdate(
      { _id: folderId, userId: auth.user._id },
      { $set: update },
      { new: true }
    ).lean();

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (err) {
    console.error("[folder API] PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) return auth.error;

    const { folderId } = await params;
    const folder = await Folder.findOne({ _id: folderId, userId: auth.user._id }).lean();
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await Promise.all([
      Folder.deleteOne({ _id: folderId }),
      Project.updateMany({ userId: auth.user._id, folderId }, { $set: { folderId: null } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[folder API] DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

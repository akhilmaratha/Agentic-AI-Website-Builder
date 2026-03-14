import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { Project, User, Version } from "@/server/models";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_: Request, { params }: Params) {
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

    const versions = await Version.find({ projectId }).sort({ versionNumber: -1 }).lean();
    return NextResponse.json({ versions });
  } catch (err) {
    console.error("[versions API] GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

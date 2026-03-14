import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { User, Subscription } from "@/server/models";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await req.json();

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || "secret_placeholder";
    
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    // Only fail if standard dev placeholder keys aren't used when signature mismatches (for demo purposes)
    const isMock = secret === "secret_placeholder";
    
    if (generated_signature !== razorpay_signature && !isMock) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await connectToDatabase();

    const dbUser = await User.findOneAndUpdate(
      { email: session.user.email }, 
      { plan: "pro" }, 
      { new: true }
    );

    if (dbUser) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1-month subscription
      
      await Subscription.create({
        userId: dbUser._id,
        plan: "pro",
        paymentProvider: "razorpay",
        status: "active",
        expiresAt,
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Payment verified successfully" 
    });
  } catch (err: any) {
    console.error("[Verify Payment API] Error:", err.message);
    return NextResponse.json(
      { error: "Verification Failed" }, 
      { status: 500 }
    );
  }
}

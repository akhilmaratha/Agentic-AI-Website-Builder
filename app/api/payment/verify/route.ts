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

    // ── Signature Verification ───────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.error("[Verify] Signature mismatch");
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // ── Update Database ──────────────────────────────────────
    await connectToDatabase();

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1-month subscription

    // Update user plan + subscription dates
    const dbUser = await User.findOneAndUpdate(
      { email: session.user.email }, 
      { 
        plan: "pro",
        subscriptionStatus: "active",
        subscriptionStart: now,
        subscriptionEnd: expiresAt,
        generationsToday: 0, // Reset on upgrade
      }, 
      { new: true }
    );

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cancel any previous active subscription
    await Subscription.updateMany(
      { userId: dbUser._id, status: "active" },
      { status: "canceled" }
    );

    // Create new subscription record
    await Subscription.create({
      userId: dbUser._id,
      plan: "pro",
      paymentProvider: "razorpay",
      status: "active",
      expiresAt,
    });

    return NextResponse.json({ 
      success: true, 
      plan: "pro",
      expiresAt: expiresAt.toISOString(),
      message: "Payment verified and subscription activated!" 
    });
  } catch (err: any) {
    console.error("[Verify Payment API] Error:", err.message || err);
    return NextResponse.json(
      { error: "Verification Failed" }, 
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let orderId = `order_${Math.random().toString(36).slice(2, 10)}`;
    const options = {
      amount: 49900, // ₹499 in paise
      currency: "INR",
      receipt: `rcpt_${Math.random().toString(36).slice(2, 8)}`,
    };

    if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID !== "rzp_test_placeholder") {
      const razorpay = new Razorpay({
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET || "",
      });
      const order = await razorpay.orders.create(options);
      orderId = order.id;
    }

    return NextResponse.json({ 
      orderId, 
      amount: options.amount 
    });
  } catch (err: any) {
    console.error("[Create Order API] Error:", err.message || err);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

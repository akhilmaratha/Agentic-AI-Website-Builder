"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { CreditCard, CheckCircle2, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import Script from "next/script";

export default function BillingPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);

  // Extract from NextAuth session
  const plan = (session?.user as any)?.plan || "free";
  const isPro = plan === "pro";

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // 1. Create order
      const orderRes = await fetch("/api/payment/create-order", { method: "POST" });
      if (!orderRes.ok) throw new Error("Failed to create order");
      
      const orderData = await orderRes.json();

      // 2. Initialize Razorpay popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: "INR",
        name: "Agentic AI",
        description: "Upgrade to Pro Plan",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          // 3. Verify Payment
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyRes.ok) {
              toast.success("Payment successful! You are now on the Pro Plan.");
              // Trigger a session refresh to reflect DB changes locally
              await update({ 
                ...session,
                user: { ...session?.user, plan: "pro" } 
              });
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            toast.error("Error verifying payment.");
          }
        },
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: {
          color: "#2547f4", // matched to UI blueprint
        },
      };

      const razor = new (window as any).Razorpay(options);
      razor.open();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <div>
          <h2 className="text-3xl font-bold mb-1">Billing & Subscription</h2>
          <p className="text-slate-400">Manage your billing information and current subscription plan.</p>
        </div>

        {/* Current Plan Overview */}
        <div className="bg-[#0d0f1a] rounded-2xl border border-slate-800 p-8 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Current Plan</p>
              <h3 className="text-3xl font-bold flex items-center gap-3">
                <span className="capitalize">{plan}</span>
                {isPro && <Zap className="w-6 h-6 text-emerald-400 fill-emerald-500" />}
              </h3>
              <p className="text-slate-400 mt-2">
                {isPro ? "You have unlimited access to AI generations and deployment." : "You're heavily limited. You have 5 generations remaining this month."}
              </p>
            </div>
            
            {!isPro && (
              <div className="bg-slate-900/50 outline-1 outline-slate-800 px-6 py-4 rounded-xl shrink-0">
                <p className="text-sm text-slate-400 mb-1">Generations left</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">5</span>
                  <span className="text-sm text-slate-400 mb-1">/ 5</span>
                </div>
              </div>
            )}
            {isPro && (
              <div className="bg-slate-900/50 outline-1 outline-emerald-500/20 px-6 py-4 rounded-xl shrink-0">
                <p className="text-sm text-emerald-400 mb-1 font-bold">Billing Cycle</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white">Active</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Section */}
        {!isPro && (
          <div className="bg-linear-to-r from-blue-600/10 to-purple-600/5 rounded-2xl border border-blue-600/20 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <h3 className="text-2xl font-bold mb-2">Upgrade to Pro</h3>
            <p className="text-slate-400 mb-8 max-w-xl">Supercharge your workflow. Drop constraints. Go unlimited.</p>

            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex-1 bg-[#0a0b14]/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-600/20 shrink-0 min-w-[320px]">
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black">₹499</span>
                  <span className="text-slate-400 mb-1">/ month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "Unlimited AI generations",
                    "Deployment and custom domain support",
                    "Priority 24/7 technical support",
                    "High-speed generation models",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                      <span className="text-sm text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg shadow-blue-600/20 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "Processing..." : "Upgrade to Pro"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4">
                <ShieldCheck className="w-16 h-16 text-slate-600" />
                <h4 className="text-lg font-bold">Enterprise-Grade Security</h4>
                <p className="text-sm text-slate-400">All payments are safely processed through Razorpay's encrypted infrastructure.</p>
                <div className="flex items-center gap-2 mt-4 opacity-60">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-semibold">Supports UPI, NetBanking, and all major Cards</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

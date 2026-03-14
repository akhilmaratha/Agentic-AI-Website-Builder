"use client";

import Navbar from "@/components/Navbar";
import { Check, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import toast from "react-hot-toast";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for exploring Agentic AI",
    features: [
      "5 AI website generations per month",
      "Basic templates",
      "Community support",
      "Standard components"
    ],
    highlight: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/month",
    description: "For professionals and serious makers",
    features: [
      "Unlimited generations",
      "Live preview",
      "Deploy to hosting",
      "Priority support",
      "Custom components"
    ],
    highlight: true,
    cta: "Upgrade Now",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large teams and scaling businesses",
    features: [
      "Unlimited projects",
      "Team collaboration",
      "API access",
      "Dedicated account manager",
      "Custom AI models"
    ],
    highlight: false,
    cta: "Contact Sales",
  }
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleCTA = async (planName: string) => {
    if (!session && planName !== "Enterprise") {
      router.push("/login");
      return;
    }

    if (planName === "Pro") {
      try {
        const orderRes = await fetch("/api/payment/create-order", { method: "POST" });
        if (!orderRes.ok) throw new Error("Failed to create order");
        const orderData = await orderRes.json();

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: orderData.amount,
          currency: "INR",
          name: "Agentic AI",
          description: "Upgrade to Pro Plan",
          order_id: orderData.orderId,
          handler: async (response: any) => {
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
                toast.success("Payment successful! Redirecting...");
                router.push("/billing");
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
          theme: { color: "#2547f4" },
        };

        const razor = new (window as any).Razorpay(options);
        razor.open();
      } catch (err: any) {
        toast.error(err.message || "Failed to initiate payment");
      }
    } else if (planName === "Enterprise") {
      toast("Our sales team will contact you.", {
        icon: "👋",
        style: { background: "#1e293b", color: "#fff", borderRadius: "10px" }
      });
    } else {
      router.push("/builder");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2547f4]/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-bold mb-6 tracking-widest uppercase">
            <Zap className="w-4 h-4" /> Simple Pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Choose your perfect plan
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Whether you&apos;re just starting out or scaling your agency, we have a plan that fits your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-8">
          {PLANS.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 ${
                plan.highlight 
                ? "bg-slate-900 border-2 border-[#2547f4] shadow-2xl shadow-[#2547f4]/20" 
                : "bg-slate-900/50 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#2547f4] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm h-10">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.period && <span className="text-slate-400 font-medium">{plan.period}</span>}
                </div>
              </div>

              <div className="flex-1">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-1 bg-emerald-500/10 p-1 rounded-md">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => handleCTA(plan.name)}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                  plan.highlight
                  ? "bg-[#2547f4] hover:bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = (provider: string) => {
    setLoading(provider);
    signIn(provider, { callbackUrl: "/builder" });
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2547f4] rounded-full blur-[160px] opacity-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600 rounded-full blur-[140px] opacity-10" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#2547f4] rounded-2xl mb-6 shadow-2xl shadow-[#2547f4]/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to start building with AI</p>
        </div>

        {/* Card */}
        <div className="bg-[#161b33]/80 backdrop-blur-xl border border-[#222949] rounded-2xl p-8 shadow-2xl">
          <div className="space-y-4">
            {/* Google */}
            <button
              onClick={() => handleSignIn("google")}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading === "google" ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Sign in with Google
            </button>

            {/* GitHub */}
            <button
              onClick={() => handleSignIn("github")}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 group"
            >
              {loading === "github" ? (
                <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              )}
              Sign in with GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#222949]" />
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">or</span>
            <div className="flex-1 h-px bg-[#222949]" />
          </div>

          {/* Demo mode */}
          <button
            onClick={() => (window.location.href = "/builder")}
            className="w-full px-6 py-3.5 border border-[#222949] hover:border-[#2547f4]/40 text-slate-300 hover:text-white font-semibold rounded-xl transition-all hover:bg-[#2547f4]/10"
          >
            Continue as Guest →
          </button>

          <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
            By signing in, you agree to our{" "}
            <a href="#" className="text-[#2547f4] hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-[#2547f4] hover:underline">Privacy Policy</a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-8">
          © 2026 Agentic AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}

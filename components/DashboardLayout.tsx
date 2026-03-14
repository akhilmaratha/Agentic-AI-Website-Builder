"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  User,
  CreditCard,
  LogOut,
  Zap,
  Crown,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const plan = (session?.user as any)?.plan || "free";
  const isPro = plan === "pro" || plan === "enterprise";
  const generationsToday = (session?.user as any)?.generationsToday || 0;
  const generationLimit = (session?.user as any)?.generationLimit || 5;

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Projects", href: "/projects", icon: FolderKanban },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Billing", href: "/billing", icon: CreditCard },
  ];

  return (
    <div className="flex h-screen bg-[#0a0b14] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#0d0f1a] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">Agentic AI</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Usage Card in Sidebar */}
        <div className="mx-4 mb-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">AI Usage</span>
            {isPro ? (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-600/20 text-purple-400 flex items-center gap-1 uppercase tracking-wider">
                <Crown className="w-2.5 h-2.5" /> Pro
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wider">
                Free
              </span>
            )}
          </div>
          {isPro ? (
            <p className="text-xs text-emerald-400 font-semibold">Unlimited generations ∞</p>
          ) : (
            <>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-black text-white">{generationsToday}</span>
                <span className="text-xs text-slate-500 mb-0.5">/ {generationLimit} today</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    generationsToday >= generationLimit ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${Math.min((generationsToday / generationLimit) * 100, 100)}%` }}
                />
              </div>
              {generationsToday >= generationLimit && (
                <Link href="/pricing" className="block mt-2 text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors">
                  Upgrade for unlimited →
                </Link>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-[#0d0f1a]/80 backdrop-blur-md shrink-0">
          <h1 className="text-lg font-bold text-white capitalize">
            {pathname.split("/").pop()}
          </h1>
          <div className="flex items-center gap-4">
            {/* Plan Badge */}
            {isPro ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600/20 text-purple-400 border border-purple-600/20 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Pro Plan
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                Free Plan
              </span>
            )}
            
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {session.user.name || "User"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isPro ? "Unlimited generations" : `${generationsToday} / ${generationLimit} generations today`}
                  </p>
                </div>
                {(session.user.image) ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FolderKanban, Plus, Eye, Edit2, Crown, Zap } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ totalProjects: 0, deployments: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const plan = (session?.user as any)?.plan || "free";
  const isPro = plan === "pro" || plan === "enterprise";
  const generationsToday = (session?.user as any)?.generationsToday || 0;
  const generationLimit = (session?.user as any)?.generationLimit || 5;

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          const projects = data.projects || [];
          setRecentProjects(projects.slice(0, 3));
          setStats({
            totalProjects: projects.length,
            deployments: projects.length,
          });
        }
      } catch (err) {
        console.error("Fetch dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-1">Welcome back, {session?.user?.name || "Builder!"}</h2>
          <p className="text-slate-400">Here's what's happening with your workspace today.</p>
        </div>
        <Link
          href="/builder"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {/* Total Projects */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all">
          <p className="text-sm text-slate-400 mb-2">Total Projects</p>
          <p className="text-3xl font-black text-blue-400">{loading ? "-" : stats.totalProjects}</p>
        </div>

        {/* AI Generations */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all">
          <p className="text-sm text-slate-400 mb-2">Generations Today</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-purple-400">{generationsToday}</p>
            {isPro ? (
              <span className="text-xs text-purple-400/60 font-bold mb-1">/ ∞</span>
            ) : (
              <span className="text-xs text-slate-500 font-bold mb-1">/ {generationLimit}</span>
            )}
          </div>
          {!isPro && (
            <div className="h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  generationsToday >= generationLimit ? "bg-red-500" : "bg-purple-600"
                }`}
                style={{ width: `${Math.min((generationsToday / generationLimit) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Current Plan */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all">
          <p className="text-sm text-slate-400 mb-2">Current Plan</p>
          <div className="flex items-center gap-2">
            {isPro ? (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600/20 text-purple-400 border border-purple-600/20 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Pro
                </span>
              </>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Free
                </span>
                <Link href="/pricing" className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  Upgrade →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Deployments */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all">
          <p className="text-sm text-slate-400 mb-2">Deployments</p>
          <p className="text-3xl font-black text-amber-400">{loading ? "-" : stats.deployments}</p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-blue-500" />
          Recent Projects
        </h3>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-800 rounded-xl" />
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/30">
            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="text-lg font-bold mb-2">No projects yet</h4>
            <p className="text-slate-400 mb-6">Create your first AI-generated website today.</p>
            <Link href="/builder" className="px-5 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all">
              Start Building
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentProjects.map((p: any) => (
              <div key={p._id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-blue-600/30 transition-all group">
                <div className="flex flex-col">
                  <span className="font-bold text-lg group-hover:text-blue-400 transition-colors">{p.name || "Untitled Project"}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{p.framework || "Next.js"}</span>
                    <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 border border-slate-700 rounded-lg hover:text-blue-400 hover:border-blue-500/50 transition-colors" title="Preview">
                    <Eye className="w-4 h-4" />
                  </button>
                  <Link href={`/builder?projectId=${p._id}`} className="p-2 border border-slate-700 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors" title="Edit in Builder">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Search, Plus, Eye, Edit2, Trash2, Code2 } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Fetch projects error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((p: any) => 
    (p.name || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.framework || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-1">My Projects</h2>
          <p className="text-slate-400">Manage and preview your AI-generated websites.</p>
        </div>
        <Link
          href="/builder"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="mb-8 relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter projects by name or framework..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 focus:border-blue-600 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map((n) => (
            <div key={n} className="h-48 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-slate-800 bg-slate-900/30">
          <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Code2 className="w-10 h-10 text-blue-400" />
          </div>
          <h4 className="text-2xl font-bold mb-3">No projects found</h4>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">It looks like you don't have any generated projects matching that criteria.</p>
          <Link href="/builder" className="px-6 py-3 border border-slate-700 hover:border-blue-500/50 hover:text-blue-400 text-slate-300 rounded-xl text-sm font-semibold transition-all">
            Clear Filters / Start New Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p: any) => (
            <div key={p._id} className="p-6 rounded-2xl border border-slate-800 bg-[#0d0f1a] shadow-lg hover:-translate-y-1 hover:border-blue-600/40 transition-all group flex flex-col h-full">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md outline-1 outline-slate-700 bg-slate-800 text-slate-300">
                    {p.framework || "Next.js"}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {p.name || "Untitled Project"}
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-800/50">
                <button className="flex-1 flex justify-center items-center gap-2 py-2 border border-slate-700 hover:border-slate-500 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <Link href={`/builder?id=${p._id}`} className="flex-1 flex justify-center items-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 rounded-lg text-xs font-bold transition-all">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Link>
                <button className="p-2 border border-slate-700 hover:border-red-500/50 hover:text-red-400 rounded-lg text-slate-400 transition-all ml-auto" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

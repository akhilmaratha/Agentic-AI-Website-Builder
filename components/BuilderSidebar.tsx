"use client";

import { FolderKanban, Plus, Search, ChevronLeft, Rocket, UserCircle2 } from "lucide-react";
import { useMemo } from "react";

export interface SidebarProject {
  _id: string;
  name: string;
  updatedAt?: string;
}

interface BuilderSidebarProps {
  projects: SidebarProject[];
  activeProjectId: string;
  searchValue: string;
  isCollapsed: boolean;
  plan: "free" | "pro" | "enterprise";
  userName?: string | null;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
}

function formatEditedAt(iso?: string): string {
  if (!iso) return "Edited just now";

  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return "Edited just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `Edited ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Edited ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "Edited yesterday";
  if (days < 7) return `Edited ${days} days ago`;

  return `Edited ${date.toLocaleDateString()}`;
}

export default function BuilderSidebar({
  projects,
  activeProjectId,
  searchValue,
  isCollapsed,
  plan,
  userName,
  onToggle,
  onSearchChange,
  onNewProject,
  onSelectProject,
}: BuilderSidebarProps) {
  const planLabel = useMemo(() => {
    if (plan === "pro") return "Pro";
    if (plan === "enterprise") return "Enterprise";
    return "Free";
  }, [plan]);

  return (
    <aside
      className={`h-full border-r border-[#222949] bg-[#0b0d18] flex flex-col shrink-0 transition-all duration-300 ${
        isCollapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      <div className="px-3 py-3 border-b border-[#222949]">
        <div className="flex items-center justify-between mb-3">
          {!isCollapsed && <p className="text-xs font-semibold tracking-wide text-slate-400">Projects</p>}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-md border border-[#2a3158] text-slate-400 hover:text-white hover:border-[#3c4a85] hover:bg-[#1a1f38] transition-all flex items-center justify-center"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <button
          onClick={onNewProject}
          className="w-full h-10 rounded-lg bg-[#2547f4] hover:bg-[#3a58f7] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          title="Create new project"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Project</span>}
        </button>
      </div>

      {!isCollapsed && (
        <div className="px-3 py-3 border-b border-[#222949]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search projects"
              className="w-full h-9 rounded-lg bg-[#12172e] border border-[#222949] text-sm text-slate-200 placeholder:text-slate-500 pl-9 pr-3 outline-none focus:border-[#3c57f6]"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {projects.map((project) => {
          const isActive = project._id === activeProjectId;
          return (
            <button
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg transition-all border ${
                isActive
                  ? "border-[#3652ee] bg-[#1a2250]"
                  : "border-transparent hover:border-[#2b356a] hover:bg-[#141b37]"
              }`}
              title={project.name}
            >
              <div className="flex items-start gap-2">
                <FolderKanban className={`w-4 h-4 mt-0.5 ${isActive ? "text-[#6f86ff]" : "text-slate-500"}`} />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-slate-300"}`}>{project.name || "New Project"}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatEditedAt(project.updatedAt)}</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[#222949] p-3 space-y-2">
        <div className="flex items-center gap-2">
          <UserCircle2 className="w-5 h-5 text-slate-400" />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{userName || "User"}</p>
              <p className="text-[11px] text-slate-500">Builder workspace</p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <span className={`text-[11px] px-2 py-1 rounded border ${plan === "free" ? "bg-[#172034] border-[#2a3a5f] text-slate-300" : "bg-[#2f1f47] border-[#5b3b8a] text-violet-300"}`}>
              {planLabel} Plan
            </span>
            {plan === "free" && (
              <button className="text-[11px] px-2 py-1 rounded bg-[#23306c] hover:bg-[#2c3c88] text-slate-100 transition-colors flex items-center gap-1">
                <Rocket className="w-3 h-3" />
                Upgrade
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

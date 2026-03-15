"use client";

import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderKanban,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Rocket,
  Search,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";

export interface SidebarProject {
  _id: string;
  name: string;
  updatedAt?: string;
  folderId?: string | null;
}

export interface SidebarFolder {
  _id: string;
  name: string;
  isCollapsed?: boolean;
}

interface BuilderSidebarProps {
  projects: SidebarProject[];
  folders: SidebarFolder[];
  activeProjectId: string;
  searchValue: string;
  isCollapsed: boolean;
  disableNewProject?: boolean;
  plan: "free" | "pro" | "enterprise";
  userName?: string | null;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFolderCollapse: (folderId: string, collapsed: boolean) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onMoveProject: (projectId: string, folderId: string | null) => void;
}

function formatEditedAt(iso?: string): string {
  if (!iso) return "Edited just now";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "Edited just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `Edited ${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Edited ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Edited yesterday";
  if (days < 7) return `Edited ${days} days ago`;

  return `Edited ${date.toLocaleDateString()}`;
}

export default function BuilderSidebar({
  projects,
  folders,
  activeProjectId,
  searchValue,
  isCollapsed,
  disableNewProject = false,
  plan,
  userName,
  onToggle,
  onSearchChange,
  onNewProject,
  onSelectProject,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderCollapse,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onMoveProject,
}: BuilderSidebarProps) {
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<SidebarProject | null>(null);
  const [editingFolder, setEditingFolder] = useState<SidebarFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SidebarProject | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);

  const planLabel = useMemo(() => {
    if (plan === "pro") return "Pro";
    if (plan === "enterprise") return "Enterprise";
    return "Free";
  }, [plan]);

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(normalizedSearch));
  }, [projects, normalizedSearch]);

  const projectsByFolder = useMemo(() => {
    const map = new Map<string, SidebarProject[]>();
    filteredProjects.forEach((p) => {
      const key = p.folderId || "__ungrouped__";
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    });
    return map;
  }, [filteredProjects]);

  const openProjectRename = (project: SidebarProject) => {
    setEditingProject(project);
    setRenameValue(project.name || "");
    setMenuProjectId(null);
  };

  const openFolderRename = (folder: SidebarFolder) => {
    setEditingFolder(folder);
    setRenameValue(folder.name || "");
  };

  const renderProjectCard = (project: SidebarProject) => {
    const isActive = project._id === activeProjectId;
    const showMenu = hoveredProjectId === project._id || menuProjectId === project._id;

    return (
      <div
        key={project._id}
        onMouseEnter={() => setHoveredProjectId(project._id)}
        onMouseLeave={() => setHoveredProjectId((prev) => (prev === project._id ? null : prev))}
        draggable
        onDragStart={() => setDragProjectId(project._id)}
        className={`relative group rounded-lg border transition-all duration-150 ${
          isActive
            ? "border-[#3f5cff] bg-[#1a2250]"
            : "border-transparent hover:border-[#2b356a] hover:bg-[#141b37]"
        }`}
      >
        <button
          onClick={() => onSelectProject(project._id)}
          className="w-full text-left px-2.5 py-2"
          title={project.name}
        >
          <div className="flex items-start gap-2 pr-7">
            <FolderKanban className={`w-4 h-4 mt-0.5 ${isActive ? "text-[#6f86ff]" : "text-slate-500"}`} />
            <div className="min-w-0">
              <p className={`text-sm truncate ${isActive ? "font-bold text-white" : "font-medium text-slate-300"}`}>
                {project.name || "New Project"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{formatEditedAt(project.updatedAt)}</p>
            </div>
          </div>
        </button>

        {showMenu && (
          <button
            onClick={() => setMenuProjectId((prev) => (prev === project._id ? null : project._id))}
            className="absolute right-1.5 top-1.5 w-6 h-6 rounded-md hover:bg-slate-700/70 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            title="Project options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}

        {menuProjectId === project._id && (
          <div className="absolute right-1 top-8 z-30 w-40 rounded-lg border border-[#2d355f] bg-[#12182f] shadow-xl py-1">
            <button
              onClick={() => openProjectRename(project)}
              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#1d2747]"
            >
              Rename Project
            </button>
            <button
              onClick={() => {
                onDuplicateProject(project._id);
                setMenuProjectId(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#1d2747]"
            >
              Duplicate Project
            </button>
            <button
              onClick={() => {
                onMoveProject(project._id, null);
                setMenuProjectId(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#1d2747]"
            >
              Move to Ungrouped
            </button>
            {folders.length > 0 && (
              <>
                <div className="my-1 border-t border-[#27305a]" />
                <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-500">Move to Folder</p>
                {folders.map((folder) => (
                  <button
                    key={folder._id}
                    onClick={() => {
                      onMoveProject(project._id, folder._id);
                      setMenuProjectId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#1d2747] truncate"
                  >
                    {folder.name}
                  </button>
                ))}
              </>
            )}
            <button
              onClick={() => {
                setDeleteTarget(project);
                setMenuProjectId(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-[#2e1e2a]"
            >
              Delete Project
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
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
            disabled={disableNewProject}
            className="w-full h-10 rounded-lg bg-[#2547f4] hover:bg-[#3a58f7] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            title="Create new project"
          >
            <Plus className="w-4 h-4" />
            {!isCollapsed && <span>{disableNewProject ? "Project limit reached" : "New Project"}</span>}
          </button>

          {!isCollapsed && (
            <button
              onClick={onCreateFolder}
              className="mt-2 w-full h-9 rounded-lg border border-[#2b3566] text-slate-300 hover:text-white hover:bg-[#1a2244] transition-all text-xs font-semibold"
            >
              + New Folder
            </button>
          )}
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

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
          {!isCollapsed && (
            <div className="space-y-1">
              {folders.map((folder) => {
                const isCollapsedFolder = !!folder.isCollapsed;
                const folderProjects = projectsByFolder.get(folder._id) || [];
                return (
                  <div
                    key={folder._id}
                    className="rounded-lg border border-transparent hover:border-[#2b356a]"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      if (!dragProjectId) return;
                      onMoveProject(dragProjectId, folder._id);
                      setDragProjectId(null);
                    }}
                  >
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <button
                        onClick={() => onToggleFolderCollapse(folder._id, !isCollapsedFolder)}
                        className="w-5 h-5 rounded hover:bg-[#1a2244] text-slate-400 hover:text-white flex items-center justify-center"
                        title={isCollapsedFolder ? "Expand folder" : "Collapse folder"}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsedFolder ? "-rotate-90" : ""}`} />
                      </button>
                      {isCollapsedFolder ? <Folder className="w-4 h-4 text-amber-300" /> : <FolderOpen className="w-4 h-4 text-amber-300" />}
                      <button
                        onDoubleClick={() => openFolderRename(folder)}
                        className="flex-1 text-left text-xs font-semibold text-slate-300 truncate"
                        title="Double-click to rename folder"
                      >
                        {folder.name}
                      </button>
                      <button
                        onClick={() => openFolderRename(folder)}
                        className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[#1a2244] text-slate-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteFolder(folder._id)}
                        className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[#2e1e2a] text-red-300"
                      >
                        Del
                      </button>
                    </div>
                    {!isCollapsedFolder && (
                      <div className="pl-5 pr-1 pb-1 space-y-1">{folderProjects.map(renderProjectCard)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isCollapsed && (
            <div
              className="pt-2 border-t border-[#20284a]"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={() => {
                if (!dragProjectId) return;
                onMoveProject(dragProjectId, null);
                setDragProjectId(null);
              }}
            >
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ungrouped</p>
              <div className="space-y-1">{(projectsByFolder.get("__ungrouped__") || []).map(renderProjectCard)}</div>
            </div>
          )}

          {isCollapsed && filteredProjects.map((project) => {
            const isActive = project._id === activeProjectId;
            return (
              <button
                key={project._id}
                onClick={() => onSelectProject(project._id)}
                className={`w-full h-10 rounded-lg border transition-all flex items-center justify-center ${
                  isActive
                    ? "border-[#3652ee] bg-[#1a2250] text-[#6f86ff]"
                    : "border-transparent text-slate-500 hover:text-slate-200 hover:border-[#2b356a]"
                }`}
                title={project.name}
              >
                <FolderKanban className="w-4 h-4" />
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

      {editingProject && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2a3158] bg-[#0f1327] p-4">
            <h3 className="text-sm font-bold text-white mb-3">Edit Project Name</h3>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full h-10 rounded-lg bg-[#12172e] border border-[#2a3158] px-3 text-sm text-slate-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingProject(null);
                  setRenameValue("");
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#2a3158] text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) onRenameProject(editingProject._id, renameValue.trim());
                  setEditingProject(null);
                  setRenameValue("");
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#3d59ff] text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingFolder && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2a3158] bg-[#0f1327] p-4">
            <h3 className="text-sm font-bold text-white mb-3">Rename Folder</h3>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full h-10 rounded-lg bg-[#12172e] border border-[#2a3158] px-3 text-sm text-slate-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setRenameValue("");
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#2a3158] text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) onRenameFolder(editingFolder._id, renameValue.trim());
                  setEditingFolder(null);
                  setRenameValue("");
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#3d59ff] text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2a3158] bg-[#0f1327] p-4">
            <h3 className="text-sm font-bold text-white mb-2">Delete Project?</h3>
            <p className="text-xs text-slate-400">This action cannot be undone for {deleteTarget.name}.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#2a3158] text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deleteTarget._id);
                  setDeleteTarget(null);
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

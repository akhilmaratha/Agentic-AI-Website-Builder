"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Zap,
    Download,
    Github,
    Rocket,
    Bell,
    CheckCircle2,
    ChevronRight,
    Share2,
    Terminal as TerminalIcon,
    Undo2,
    Redo2,
    History,
    LayoutTemplate,
    Monitor,
    Code2,
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
import CodePanel from "@/components/CodePanel";
import FileExplorer from "@/components/FileExplorer";
import TerminalPanel from "@/components/TerminalPanel";
import BuilderSidebar, { SidebarProject } from "@/components/BuilderSidebar";

interface ApiMessage {
    _id?: string;
    role: "user" | "ai";
    content: string;
    code?: string;
    filename?: string;
    createdAt?: string;
}

interface ApiProject {
    _id: string;
    name: string;
    updatedAt?: string;
    previewHTML?: string;
}

export default function BuilderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const {
        projectId,
        setProjectId,
        projectName,
        setProjectName,
        resetProjectState,
        isGenerating,
        messages,
        setMessages,
        setFiles,
        updatePreview,
        setRightTab,
        rightTab,
    } = useBuilderStore();

    const [projects, setProjects] = useState<SidebarProject[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [searchValue, setSearchValue] = useState("");
    const [workspaceView, setWorkspaceView] = useState<"preview" | "code">("preview");

    const activeProjectIdFromQuery = useMemo(
        () => searchParams.get("projectId") || searchParams.get("id") || "",
        [searchParams],
    );

    const loadProjects = useCallback(
        async (query = "") => {
            const qs = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
            const res = await fetch(`/api/projects${qs}`);
            if (!res.ok) return;

            const data = await res.json();
            const list: SidebarProject[] = Array.isArray(data.projects)
                ? (data.projects as ApiProject[])
                    .map((p: ApiProject) => ({
                        _id: String(p._id),
                        name: p.name || "New Project",
                        updatedAt: p.updatedAt,
                    }))
                    .sort((a: SidebarProject, b: SidebarProject) => {
                        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                        return bTime - aTime;
                    })
                : [];

            setProjects(list);

            // Auto-select most recent project if none is selected in URL.
            if (!activeProjectIdFromQuery && !projectId && list.length > 0) {
                await loadProject(list[0]._id, true);
            }
        },
        [activeProjectIdFromQuery, projectId],
    );

    const loadProject = useCallback(
        async (nextProjectId: string, pushUrl: boolean) => {
            if (!nextProjectId) return;

            resetProjectState();
            setProjectId(nextProjectId);

            const [projectRes, msgRes, filesRes] = await Promise.all([
                fetch(`/api/projects/${nextProjectId}`),
                fetch(`/api/projects/${nextProjectId}/messages`),
                fetch(`/api/projects/${nextProjectId}/files`),
            ]);

            if (!projectRes.ok) return;

            const [projectData, msgData, filesData] = await Promise.all([
                projectRes.json(),
                msgRes.ok ? msgRes.json() : Promise.resolve({ messages: [] }),
                filesRes.ok ? filesRes.json() : Promise.resolve({ files: {} }),
            ]);

            const project = projectData.project as ApiProject;
            const apiMessages: ApiMessage[] = Array.isArray(msgData.messages) ? msgData.messages : [];
            const hydratedMessages = apiMessages.map((msg, idx) => ({
                id: msg._id || `${nextProjectId}-${idx}`,
                role: msg.role,
                content: msg.content,
                code: msg.code,
                filename: msg.filename,
                timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
            }));

            setProjectName(project?.name || "New Project");
            setMessages(hydratedMessages);
            setFiles((filesData.files as Record<string, string>) || {});
            updatePreview(project?.previewHTML || "");

            if (pushUrl) {
                router.push(`/builder?projectId=${nextProjectId}`);
            }
        },
        [resetProjectState, setProjectId, setProjectName, setMessages, setFiles, updatePreview, router],
    );

    const createNewProject = useCallback(async () => {
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });

        if (!res.ok) return;
        const data = await res.json();

        const created = data.project as ApiProject;
        if (!created?._id) return;

        resetProjectState();
        setProjectId(String(created._id));
        setProjectName(created.name || "New Project");
        setMessages([]);
        setFiles({});
        updatePreview("");

        router.push(`/builder?projectId=${created._id}`);

        await loadProjects(searchValue);
    }, [resetProjectState, setProjectId, setProjectName, setMessages, setFiles, updatePreview, router, loadProjects, searchValue]);

    useEffect(() => {
        void loadProjects(searchValue);
    }, [loadProjects, searchValue]);

    useEffect(() => {
        if (activeProjectIdFromQuery) {
            void loadProject(activeProjectIdFromQuery, false);
        }
    }, [activeProjectIdFromQuery, loadProject]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "j") {
                e.preventDefault();
                setRightTab(rightTab === "terminal" ? "code" : "terminal");
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "b") {
                e.preventDefault();
                setIsChatOpen((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [rightTab, setRightTab]);

    const handleDownload = () => {
        const blob = new Blob(["// Download coming soon"], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "project.zip";
        a.click();
    };

    const userPlan = ((session?.user as Record<string, unknown> | undefined)?.plan as "free" | "pro" | "enterprise" | undefined) || "free";

    return (
        <div className="h-screen flex flex-col bg-[#0a0b14] text-slate-100 overflow-hidden font-sans">
            <header className="flex items-center justify-between px-4 h-14 border-b border-[#222949] bg-[#0a0b14]/90 backdrop-blur-md shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors group"
                    >
                        <Zap className="text-white w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>

                    <span className="w-px h-5 bg-[#222949] mx-1" />

                    <div className="flex items-center text-sm font-medium text-slate-400">
                        <button className="hover:text-white transition-colors">Workspace</button>
                        <ChevronRight className="w-4 h-4 mx-1.5 text-slate-600" />
                        <button className="text-white hover:text-blue-400 transition-colors truncate max-w-[220px]">
                            {projectName || "Untitled Project"}
                        </button>
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full ${isGenerating ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}
                        />
                        <span className="text-xs text-slate-500 font-mono">
                            {isGenerating ? "Generating..." : "Ready"}
                        </span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1 p-1 bg-[#161b33] border border-[#222949] rounded-lg">
                    <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" title="Undo (Ctrl+Z)">
                        <Undo2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" title="Redo (Ctrl+Y)">
                        <Redo2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" title="Version History">
                        <History className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" title="Components">
                        <LayoutTemplate className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 mr-2 bg-[#161b33] p-1 rounded-lg border border-[#222949]">
                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${isChatOpen ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                        >
                            Chat (Ctrl+B)
                        </button>
                        <button
                            onClick={() => setRightTab(rightTab === "terminal" ? "code" : "terminal")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${rightTab === "terminal" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                        >
                            Terminal (Ctrl+J)
                        </button>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] hover:bg-slate-800 border border-[#222949] text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all shrink-0"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] hover:bg-slate-800 border border-[#222949] text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all shrink-0">
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                    <button className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black hover:bg-slate-200 rounded-lg text-xs font-bold transition-all shrink-0">
                        <Rocket className="w-3.5 h-3.5" />
                        Deploy
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative bg-[#0a0b14]">
                <BuilderSidebar
                    projects={projects}
                    activeProjectId={projectId}
                    searchValue={searchValue}
                    isCollapsed={isSidebarCollapsed}
                    plan={userPlan}
                    userName={session?.user?.name}
                    onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
                    onSearchChange={setSearchValue}
                    onNewProject={() => void createNewProject()}
                    onSelectProject={(id) => void loadProject(id, true)}
                />

                {isChatOpen && (
                    <aside className="w-[360px] lg:w-[400px] border-r border-[#222949] flex flex-col shrink-0 bg-[#0a0b14] z-20">
                        <ChatPanel isFloating={false} />
                    </aside>
                )}

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-11 border-b border-[#222949] bg-[#0d0f1a] px-3 flex items-center">
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#161b33] border border-[#222949]">
                            <button
                                onClick={() => setWorkspaceView("preview")}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${workspaceView === "preview" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                                <Monitor className="w-3.5 h-3.5" />
                                Preview
                            </button>
                            <button
                                onClick={() => setWorkspaceView("code")}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${workspaceView === "code" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                                <Code2 className="w-3.5 h-3.5" />
                                Code
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {workspaceView === "preview" ? (
                            <div className="flex-1 flex flex-col relative bg-[#131521] min-w-0">
                                <PreviewPanel />
                            </div>
                        ) : (
                            <>
                                <aside className="w-64 border-r border-[#222949] bg-[#0d0f1c] shrink-0 overflow-y-auto">
                                    <FileExplorer />
                                </aside>
                                <div className="flex-1 flex flex-col relative bg-[#131521] min-w-0">
                                    <CodePanel />
                                </div>
                            </>
                        )}
                    </div>

                    <div
                        className={`border-t border-[#222949] bg-[#060709] shrink-0 flex flex-col transition-all duration-300 ${rightTab === "terminal" ? "h-64" : "h-0 border-none overflow-hidden"}`}
                    >
                        <TerminalPanel />
                    </div>
                </div>
            </div>

            <footer className="h-6 border-t border-[#222949] bg-[#2547f4] flex items-center justify-between px-3 text-[10px] text-white font-medium shrink-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                        <Github className="w-3 h-3" />
                        <span>main</span>
                    </div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>0</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                        <TerminalIcon className="w-3 h-3" />
                        <span>Node.js Environment</span>
                    </div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                        <Bell className="w-3 h-3" />
                    </div>
                </div>
            </footer>
        </div>
    );
}

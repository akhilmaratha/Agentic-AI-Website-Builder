"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Download, Github, Rocket, Bell, CheckCircle2, ChevronRight,
  Share2, Terminal as TerminalIcon, Maximize2, X, Undo2, Redo2, History,
  LayoutTemplate
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import ChatPanel    from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
import CodePanel    from "@/components/CodePanel";
import FileExplorer from "@/components/FileExplorer";

export default function BuilderPage() {
  const router = useRouter();
  const {
    prompt, projectName,
    isGenerating, messages, setMessages,
    addMessage, updateLastMessage,
    updateFiles, updatePreview, addLog, terminalLogs,
    setIsGenerating, setRightTab, rightTab
  } = useBuilderStore();

  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // On mount: fetch messages from DB. If empty and there's a prompt, auto-generate.
  useEffect(() => {
    async function initBuilder() {
      try {
        const res = await fetch("/api/messages");
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            return; 
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }

      if (prompt) {
        handleInitialGenerate(prompt);
      }
    }

    initBuilder();
    
    // Setup keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + J to toggle terminal tab
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setRightTab(rightTab === "terminal" ? "code" : "terminal");
      }
      // CMD/CTRL + B to toggle chat
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsChatOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleInitialGenerate(userPrompt: string) {
    setIsGenerating(true);
    addMessage({ role: "user", content: userPrompt });
    addMessage({ role: "ai", content: "", isStreaming: true });
    addLog(`[${new Date().toLocaleTimeString()}] Starting generation: "${userPrompt.slice(0, 50)}"`);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt }),
      });
      const data = await res.json();

      updateLastMessage(data.reply ?? "Done!", data.code, data.filename);
      if (data.files)   updateFiles(data.files);
      if (data.preview) updatePreview(data.preview);
      addLog(`[${new Date().toLocaleTimeString()}] \x1b[32mevent\x1b[0m  - Generation complete`);
    } catch {
      updateLastMessage("Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  const handleDownload = () => {
    const blob = new Blob(["// Download coming soon"], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "project.zip";
    a.click();
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0b14] text-slate-100 overflow-hidden font-sans">
      {/* ── TOP HEADER ─────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-[#222949] bg-[#0a0b14]/90 backdrop-blur-md shrink-0 z-20">
        {/* Left: logo + project */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors group"
          >
            <Zap className="text-white w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>

          <span className="w-px h-5 bg-[#222949] mx-1" />

          {/* Project Breadcrumb */}
          <div className="flex items-center text-sm font-medium text-slate-400">
            <button className="hover:text-white transition-colors">Workspace</button>
            <ChevronRight className="w-4 h-4 mx-1.5 text-slate-600" />
            <button className="text-white hover:text-blue-400 transition-colors truncate max-w-[200px]">
              {projectName || "Untitled Project"}
            </button>
          </div>

          <div className="ml-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isGenerating ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-xs text-slate-500 font-mono">
              {isGenerating ? "Generating..." : "Ready"}
            </span>
          </div>
        </div>

        {/* Center: Toolbar Actions (Undo/Redo) */}
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

        {/* Right: actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 mr-2 bg-[#161b33] p-1 rounded-lg border border-[#222949]">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${isChatOpen ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Chat (⌘B)
            </button>
            <button
              onClick={() => setRightTab(rightTab === "terminal" ? "code" : "terminal")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${rightTab === "terminal" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Terminal (⌘J)
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] hover:bg-slate-800 border border-[#222949] text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] hover:bg-slate-800 border border-[#222949] text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black hover:bg-slate-200 rounded-lg text-xs font-bold transition-all shrink-0"
          >
            <Rocket className="w-3.5 h-3.5" />
            Deploy
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ──────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Chat Panel */}
        {isChatOpen && (
          <ChatPanel isFloating={false} />
        )}

        {/* Center: Preview Area */}
        <div className="flex-1 flex flex-col relative bg-[#131521]">
          <PreviewPanel />
        </div>

        {/* Right Sidebar: Code / Files / Terminal */}
        <aside className="w-[450px] xl:w-[500px] border-l border-[#222949] bg-[#0d0f1a] flex flex-col shrink-0 z-10">
          <CodePanel />
        </aside>
      </div>

      {/* ── MINIMAL STATUS BAR ──────────────────── */}
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

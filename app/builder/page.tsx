"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Download, Github, Rocket,
  GitBranch, Bell, CheckCircle2, ChevronRight,
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import ChatPanel    from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
import CodePanel    from "@/components/CodePanel";

export default function BuilderPage() {
  const router = useRouter();
  const {
    prompt, projectName,
    isGenerating, messages, setMessages,
    addMessage, updateLastMessage,
    updateFiles, updatePreview, addLog,
    setIsGenerating,
  } = useBuilderStore();

  // On mount: fetch messages from DB. If empty and there's a prompt, auto-generate.
  useEffect(() => {
    async function initBuilder() {
      try {
        const res = await fetch("/api/messages");
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            return; // We have loaded DB messages 
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }

      // If no messages found in DB and we have a prompt, start initially generating
      if (prompt) {
        handleInitialGenerate(prompt);
      }
    }

    initBuilder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="h-screen flex flex-col bg-[#0a0b14] text-slate-100 overflow-hidden">
      {/* ── TOP HEADER ─────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#222949] bg-[#0a0b14] shrink-0 z-20">
        {/* Left: logo + project */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-[#2547f4] rounded-lg flex items-center justify-center">
              <Zap className="text-white w-4 h-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-slate-100 text-sm font-bold">Agentic AI</span>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">Builder</span>
            </div>
          </button>

          <span className="h-5 w-px bg-[#222949]" />

          {/* Project name + status */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">
              {projectName.length > 30 ? projectName.slice(0, 30) + "…" : projectName}
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isGenerating ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <span className="text-[11px] text-slate-400">
                {isGenerating ? "Generating..." : "Environment Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            id="btn-download"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] hover:bg-slate-700 border border-[#222949] rounded-lg text-slate-200 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            id="btn-github"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] hover:bg-slate-700 border border-[#222949] rounded-lg text-slate-200 text-xs font-semibold transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </button>

          <button
            id="btn-deploy"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2547f4] hover:bg-blue-600 rounded-lg text-white text-xs font-bold transition-all shadow-lg shadow-[#2547f4]/20"
          >
            <Rocket className="w-3.5 h-3.5" />
            Deploy App
          </button>
        </div>
      </header>

      {/* ── MAIN 3-PANEL LAYOUT ─────────────────── */}
      <main className="flex flex-1 overflow-hidden">
        <ChatPanel />
        <PreviewPanel />
        <CodePanel />
      </main>

      {/* ── BOTTOM STATUS BAR ───────────────────── */}
      <footer className="h-7 border-t border-[#222949] bg-[#0a0b14] flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#2547f4]">
            <GitBranch className="w-3 h-3" />
            <span className="font-bold">main</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-slate-300 cursor-pointer transition-colors">
            <span>Synchronized with GitHub</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>TypeScript</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-slate-300 cursor-pointer transition-colors">
            <Bell className="w-3 h-3" />
            <span>3 Notifications</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="w-3 h-3" />
            <span>UTF-8</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

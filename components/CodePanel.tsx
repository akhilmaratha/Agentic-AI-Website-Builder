"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { Code2, FolderTree, TerminalIcon, Copy, Check } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import FileExplorer from "./FileExplorer";

// Monaco editor (SSR disabled - it's browser-only)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-[#2547f4] rounded-full animate-spin" />
        <span className="text-xs">Loading editor...</span>
      </div>
    </div>
  ),
});

const TABS = [
  { id: "code" as const,     label: "CODE",     icon: Code2 },
  { id: "files" as const,    label: "FILES",    icon: FolderTree },
  { id: "terminal" as const, label: "TERMINAL", icon: TerminalIcon },
];

// Map file extension → Monaco language
function getLanguage(filename: string): string {
  const ext = filename.split(".").pop() ?? "";
  const map: Record<string, string> = {
    tsx: "typescript", ts: "typescript", jsx: "javascript", js: "javascript",
    css: "css", json: "json", html: "html", md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

export default function CodePanel() {
  const {
    rightTab, setRightTab,
    files, activeFile, setActiveFile, setFileContent,
    terminalLogs,
  } = useBuilderStore();

  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const currentCode = files[activeFile] ?? "// No content";
  const language    = getLanguage(activeFile);

  // Auto-scroll terminal
  useEffect(() => {
    if (rightTab === "terminal") {
      terminalRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
    }
  }, [terminalLogs, rightTab]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-[450px] border-l border-[#222949] flex flex-col bg-[#0a0b14]">
      {/* Tab bar */}
      <div className="flex border-b border-[#222949] shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => setRightTab(id)}
            className={`flex-1 py-3 border-b-2 text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 transition-all ${
              rightTab === id
                ? "border-[#2547f4] text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── CODE TAB ─────────────────────────────── */}
      {rightTab === "code" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File name bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b33] border-b border-[#222949] shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-400 font-mono">{activeFile}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Monaco editor */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={language}
              value={currentCode}
              onChange={(value) => {
                if (value !== undefined) {
                  setFileContent(activeFile, value);
                }
              }}
              theme="vs-dark"
              options={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
                lineNumbers: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                renderLineHighlight: "gutter",
                smoothScrolling: true,
                cursorBlinking: "phase",
                contextmenu: true,
                suggestOnTriggerCharacters: true,
                formatOnPaste: true,
                formatOnType: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>
      )}

      {/* ── FILES TAB ─────────────────────────────── */}
      {rightTab === "files" && (
        <div className="flex-1 overflow-y-auto">
          <FileExplorer />
        </div>
      )}

      {/* ── TERMINAL TAB ──────────────────────────── */}
      {rightTab === "terminal" && (
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 bg-[#060709] font-mono text-[12px] leading-relaxed"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Build Logs</span>
            <span className="h-px flex-1 bg-[#222949]" />
            <span className="text-[10px] text-slate-600">
              {new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-1">
            {terminalLogs.map((log, i) => {
              const isError   = log.includes("error") || log.includes("ERR");
              const isWarn    = log.includes("warn");
              const isSuccess = log.includes("ready") || log.includes("success") || log.includes("compiled");
              const isInfo    = log.includes("info");

              return (
                <p
                  key={i}
                  className={`
                    ${isError   ? "text-red-400"     : ""}
                    ${isWarn    ? "text-amber-400"   : ""}
                    ${isSuccess ? "text-emerald-400" : ""}
                    ${isInfo    ? "text-blue-400"    : ""}
                    ${!isError && !isWarn && !isSuccess && !isInfo ? "text-slate-400" : ""}
                  `}
                >
                  {log}
                </p>
              );
            })}
            {/* Blinking cursor */}
            <p className="text-slate-500 animate-pulse">▊</p>
          </div>
        </div>
      )}
    </aside>
  );
}

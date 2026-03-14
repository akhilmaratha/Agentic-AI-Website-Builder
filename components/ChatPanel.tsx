"use client";

import { useRef, useEffect, useState } from "react";
import {
  Sparkles, Send, RefreshCw, Bug, PlusCircle,
  Zap, User, ChevronDown, Crown, X, ArrowRight,
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSession } from "next-auth/react";
import Link from "next/link";

const SUGGESTION_CHIPS = [
  "Add a testimonials section",
  "Make the hero more vibrant",
  "Add a pricing section",
  "Create a contact form",
  "Add a sticky navbar",
];

export default function ChatPanel({ isFloating = false }: { isFloating?: boolean }) {
  const {
    messages, addMessage, updateLastMessage,
    isGenerating, setIsGenerating,
    updateFiles, updatePreview, addLog,
    activeFile, files, projectId,
  } = useBuilderStore();

  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [genStatus, setGenStatus] = useState({ used: 0, limit: 5, plan: "free" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPro = genStatus.plan === "pro" || genStatus.plan === "enterprise";
  const limitReached = !isPro && genStatus.used >= genStatus.limit;

  // Fetch generation status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/generation-status");
        if (res.ok) {
          const data = await res.json();
          setGenStatus(data);
        }
      } catch {}
    }
    fetchStatus();
  }, [messages.length]); 

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isGenerating) return;

    if (limitReached) {
      setShowUpgradeModal(true);
      return;
    }

    setInput("");
    setIsGenerating(true);

    addMessage({ role: "user", content: msg });
    addMessage({ role: "ai", content: "", isStreaming: true });

    const ts = new Date().toLocaleTimeString();
    addLog(`[${ts}] User: ${msg.slice(0, 60)}`);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          projectId,
          messages: messages.concat({ id: "", role: "user", content: msg, timestamp: Date.now() })
            .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
          projectContext: {
            currentFile: activeFile,
            files: files, // Send ALL existing files for safe-editing mode!
          },
        }),
      });

      const data = await res.json();

      if (data.limitReached) {
        updateLastMessage(data.reply ?? "Generation limit reached.");
        setShowUpgradeModal(true);
        return;
      }

      updateLastMessage(data.reply ?? "Done!", data.code, data.filename);

      if (data.files && Object.keys(data.files).length > 0) {
        updateFiles(data.files);
        addLog(`[${new Date().toLocaleTimeString()}] \x1b[32mevent\x1b[0m  - ${Object.keys(data.files).length} file(s) updated`);
      }
      if (data.preview) {
        updatePreview(data.preview);
      }
    } catch (err) {
      console.error(err);
      updateLastMessage("Sorry, something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#0a0b14]/60 ${!isFloating ? "w-[380px] min-w-[380px] border-r border-[#222949]" : "w-full"}`}>
      {/* Header element conditionally rendered below */}
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#222949] flex items-center justify-between bg-[#0a0b14]">
        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-100">
          <Sparkles className="w-4 h-4 text-[#2547f4]" />
          AI Assistant
        </h3>
        <div className="flex items-center gap-2">
          {/* Generation usage badge */}
          {isPro ? (
            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-600/20 text-purple-400 font-bold tracking-wide flex items-center gap-1">
              <Crown className="w-3 h-3" /> PRO
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
              limitReached 
                ? "bg-red-600/20 text-red-400" 
                : "bg-emerald-600/20 text-emerald-400"
            }`}>
              {genStatus.used}/{genStatus.limit} used
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[10px] bg-[#2547f4]/20 text-[#2547f4] font-bold tracking-wide">
            GPT-4o
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-14 h-14 rounded-2xl bg-[#2547f4]/10 border border-[#2547f4]/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-[#2547f4]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-300 mb-1">AI Builder Ready</p>
              <p className="text-xs text-slate-500 max-w-[200px]">
                Describe the website you want to build...
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["Landing page", "Dashboard", "Portfolio"].map((ex) => (
                <button
                  key={ex}
                  onClick={() => sendMessage(`Build a ${ex}`)}
                  className="px-3 py-1.5 rounded-full bg-slate-800/60 border border-[#222949] text-xs text-slate-400 hover:border-[#2547f4]/40 hover:text-[#2547f4] transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              // ── User message ──────────────────
              <div className="flex gap-3 flex-row-reverse animate-slide-right">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-200" />
                </div>
                <div className="space-y-1 max-w-[85%] flex flex-col items-end">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">You</p>
                  <div className="bg-[#2547f4]/10 border border-[#2547f4]/30 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-slate-200">
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ) : (
              // ── AI message ────────────────────
              <div className="flex gap-3 animate-slide-left">
                <div className="w-8 h-8 rounded-lg bg-[#2547f4]/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-[#2547f4]" />
                </div>
                <div className="space-y-2 max-w-[88%]">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">AI Builder</p>

                  {msg.isStreaming ? (
                    <div className="bg-[#161b33] border border-[#222949] px-4 py-3 rounded-2xl rounded-tl-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#2547f4] typing-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">Generating...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#161b33] border border-[#222949] rounded-2xl rounded-tl-sm overflow-hidden">
                      <div className="px-4 py-3 text-sm leading-relaxed text-slate-200">
                        {msg.content}
                      </div>

                      {/* Code block */}
                      {msg.code && (
                        <div className="border-t border-[#222949]">
                          {/* File bar */}
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-[#222949]">
                            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                              {msg.filename ?? "component.tsx"}
                            </span>
                            <button
                              onClick={() => navigator.clipboard?.writeText(msg.code!)}
                              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="px-4 py-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                            {msg.code.slice(0, 800)}{msg.code.length > 800 ? "\n..." : ""}
                          </pre>
                          <div className="flex gap-2 px-4 py-3 border-t border-[#222949]">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2547f4]/20 border border-[#2547f4]/30 text-[#2547f4] text-xs font-bold rounded-lg hover:bg-[#2547f4]/30 transition-all">
                              Apply changes
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b33] border border-[#222949] text-slate-400 text-xs font-bold rounded-lg hover:text-slate-200 transition-all">
                              Preview
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!msg.isStreaming && (
                    <p className="text-[10px] text-slate-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Bottom area */}
      <div className="p-4 space-y-3 border-t border-[#222949] bg-[#0a0b14]">
        {/* Limit reached warning */}
        {limitReached && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <Crown className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-red-400">Daily limit reached</p>
              <p className="text-[10px] text-slate-400">Upgrade to Pro for unlimited AI generations.</p>
            </div>
            <Link
              href="/pricing"
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg transition-all shrink-0"
            >
              Upgrade
            </Link>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => sendMessage("Regenerate the last component with improvements")}
            disabled={isGenerating || limitReached}
            className="flex-1 py-2 px-3 bg-[#161b33] hover:bg-slate-700 border border-[#222949] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
          <button
            onClick={() => sendMessage("Find and fix any errors or issues in the current code")}
            disabled={isGenerating || limitReached}
            className="flex-1 py-2 px-3 bg-[#161b33] hover:bg-slate-700 border border-[#222949] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Bug className="w-3.5 h-3.5" /> Fix Errors
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              disabled={isGenerating || limitReached}
              className="whitespace-nowrap px-3 py-1.5 bg-slate-800/50 hover:bg-[#2547f4]/20 hover:border-[#2547f4]/50 border border-[#222949] rounded-full text-[11px] font-medium text-slate-400 hover:text-[#2547f4] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || limitReached}
            placeholder={limitReached ? "Daily limit reached. Upgrade to Pro." : "Ask AI to modify your website..."}
            rows={2}
            style={{ maxHeight: "160px" }}
            className={`w-full bg-[#161b33] border border-[#222949] rounded-xl px-4 py-3 pr-12 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-[#2547f4] focus:border-[#2547f4] outline-none resize-none transition-all ${
              limitReached ? "opacity-60 cursor-not-allowed" : ""
            }`}
          />
          <button
            id="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={isGenerating || !input.trim() || limitReached}
            title={limitReached ? "Daily generation limit reached. Upgrade to Pro." : "Send message"}
            className={`absolute bottom-3 right-3 p-1.5 rounded-lg text-white transition-all ${
              limitReached
                ? "bg-slate-700 opacity-40 cursor-not-allowed"
                : "bg-[#2547f4] hover:bg-blue-600 disabled:opacity-40"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Footer line */}
        <div className="flex items-center justify-between px-1">
          <button className="text-[11px] font-bold text-slate-400 flex items-center gap-1 hover:text-slate-200 transition-colors">
            <PlusCircle className="w-3.5 h-3.5" /> Add Section
          </button>
          <span className="text-[10px] text-slate-600">⌘ + Enter to send</span>
        </div>
      </div>

      {/* ── Upgrade Modal ───────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0f1a] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-slide-up">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-600/20">
                <Crown className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Upgrade to Pro</h3>
              <p className="text-slate-400">You've used all 5 free AI generations today.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Unlimited website generations",
                "Faster AI response times",
                "Full deployment support",
                "Priority technical support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/pricing"
              onClick={() => setShowUpgradeModal(false)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold shadow-lg shadow-purple-600/20 text-white transition-all"
            >
              Upgrade to Pro — ₹499/month
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full mt-3 py-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

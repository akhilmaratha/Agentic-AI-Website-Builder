"use client";

import { useState, useRef } from "react";
import {
  Monitor, Tablet, Smartphone, RefreshCw,
  ExternalLink, Lock,
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";

const VIEWPORT_CONFIG = {
  desktop: { width: "100%",   label: "Desktop",  icon: Monitor },
  tablet:  { width: "768px",  label: "Tablet",   icon: Tablet  },
  mobile:  { width: "390px",  label: "Mobile",   icon: Smartphone },
} as const;

export default function PreviewPanel() {
  const { viewport, setViewport, previewHTML, isGenerating } = useBuilderStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleOpenNew = () => {
    const blob = new Blob([previewHTML], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const activeConfig = VIEWPORT_CONFIG[viewport];

  return (
    <section className="flex-1 flex flex-col bg-[#0d0f1a] min-w-0">
      {/* Toolbar */}
      <div className="h-12 border-b border-[#222949] flex items-center justify-between px-4 bg-[#0a0b14] shrink-0">
        {/* Left: viewport + URL bar */}
        <div className="flex items-center gap-3">
          {/* Viewport toggle */}
          <div className="flex p-1 bg-[#161b33] rounded-lg border border-[#222949]">
            {(Object.entries(VIEWPORT_CONFIG) as [typeof viewport, typeof VIEWPORT_CONFIG[typeof viewport]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  id={`viewport-${key}`}
                  onClick={() => setViewport(key)}
                  title={cfg.label}
                  className={`p-1.5 rounded-md transition-all ${
                    viewport === key
                      ? "text-[#2547f4] bg-[#2547f4]/20"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* URL bar */}
          <div className="flex items-center bg-[#161b33] border border-[#222949] rounded-lg px-3 py-1.5 gap-2">
            <Lock className="w-3 h-3 text-slate-500" />
            <span className="text-[11px] text-slate-400 font-medium">localhost:3000/preview</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {isGenerating && (
            <span className="text-[10px] text-[#2547f4] font-bold animate-pulse mr-2">
              Generating...
            </span>
          )}
          <button
            id="preview-refresh"
            onClick={handleRefresh}
            title="Refresh"
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          </button>
          <button
            id="preview-open-new"
            onClick={handleOpenNew}
            title="Open in new tab"
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex justify-center p-6 bg-[#080a11]">
        {/* Outer chrome */}
        <div
          className="h-full transition-all duration-300 flex flex-col rounded-xl shadow-2xl border border-[#222949] overflow-hidden bg-white"
          style={{ width: activeConfig.width, minHeight: "100%" }}
        >
          {/* Browser chrome strip */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 h-6 bg-white rounded-md border border-slate-200 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 font-medium">localhost:3000</span>
            </div>
          </div>

          {/* iframe */}
          <iframe
            ref={iframeRef}
            key={refreshKey}
            srcDoc={previewHTML}
            className="flex-1 w-full border-none"
            sandbox="allow-scripts allow-same-origin"
            title="Website Preview"
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useBuilderStore } from "@/store/useBuilderStore";

export default function TerminalPanel() {
  const { terminalLogs } = useBuilderStore();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [terminalLogs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#060709]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#222949] bg-[#0d0f1a] shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Terminal
        </span>
        <span className="text-[10px] text-slate-600">
          {new Date().toLocaleDateString()}
        </span>
      </div>
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed"
      >
        <div className="space-y-1">
          {terminalLogs.map((log, i) => {
            const isError = log.includes("error") || log.includes("ERR");
            const isWarn = log.includes("warn");
            const isSuccess =
              log.includes("ready") ||
              log.includes("success") ||
              log.includes("compiled");
            const isInfo = log.includes("info");

            return (
              <p
                key={i}
                className={`
                  ${isError ? "text-red-400" : ""}
                  ${isWarn ? "text-amber-400" : ""}
                  ${isSuccess ? "text-emerald-400" : ""}
                  ${isInfo ? "text-blue-400" : ""}
                  ${!isError && !isWarn && !isSuccess && !isInfo ? "text-slate-400" : ""}
                `}
              >
                {log}
              </p>
            );
          })}
          <p className="text-slate-500 animate-pulse">▊</p>
        </div>
      </div>
    </div>
  );
}

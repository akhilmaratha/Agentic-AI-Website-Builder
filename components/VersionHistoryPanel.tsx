"use client";

import { useEffect, useMemo, useState } from "react";
import { History, RotateCcw, X } from "lucide-react";

interface VersionItem {
  _id: string;
  versionNumber: number;
  description: string;
  createdAt: string;
}

interface CompareResponse {
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
  files: {
    added: string[];
    removed: string[];
    changed: string[];
  };
}

interface VersionHistoryPanelProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onRestore: (files: Record<string, string>) => void;
}

export default function VersionHistoryPanel({
  open,
  projectId,
  onClose,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [baseVersionId, setBaseVersionId] = useState("");
  const [targetVersionId, setTargetVersionId] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);

  useEffect(() => {
    async function loadVersions() {
      if (!open || !projectId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/versions`);
        if (!res.ok) return;
        const data = await res.json();
        const list: VersionItem[] = Array.isArray(data.versions) ? data.versions : [];
        setVersions(list);
        setBaseVersionId(list[1]?._id || list[0]?._id || "");
        setTargetVersionId(list[0]?._id || "");
      } finally {
        setLoading(false);
      }
    }

    void loadVersions();
  }, [open, projectId]);

  const canCompare = useMemo(
    () => !!baseVersionId && !!targetVersionId && baseVersionId !== targetVersionId,
    [baseVersionId, targetVersionId]
  );

  const runCompare = async () => {
    if (!canCompare || !projectId) return;
    const res = await fetch(`/api/projects/${projectId}/versions/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseVersionId, targetVersionId }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setCompareResult(data);
  };

  const restoreVersion = async (versionId: string) => {
    if (!projectId) return;
    setRestoringId(versionId);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onRestore((data.files || {}) as Record<string, string>);
    } finally {
      setRestoringId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[380px] border-l border-[#273064] bg-[#0e1225] pointer-events-auto flex flex-col">
        <div className="h-12 border-b border-[#273064] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#6f86ff]" />
            <h3 className="text-sm font-bold text-white">Version History</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-[#1a2244] text-slate-400 hover:text-white">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>

        <div className="p-4 border-b border-[#273064] space-y-2">
          <p className="text-xs text-slate-400">Compare versions</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={baseVersionId}
              onChange={(e) => setBaseVersionId(e.target.value)}
              className="h-9 rounded-lg bg-[#12172e] border border-[#2a3158] text-xs text-slate-200 px-2"
            >
              {versions.map((v) => (
                <option key={v._id} value={v._id}>V{v.versionNumber}</option>
              ))}
            </select>
            <select
              value={targetVersionId}
              onChange={(e) => setTargetVersionId(e.target.value)}
              className="h-9 rounded-lg bg-[#12172e] border border-[#2a3158] text-xs text-slate-200 px-2"
            >
              {versions.map((v) => (
                <option key={v._id} value={v._id}>V{v.versionNumber}</option>
              ))}
            </select>
          </div>
          <button
            onClick={runCompare}
            disabled={!canCompare}
            className="w-full h-9 rounded-lg bg-[#324ecf] disabled:opacity-50 text-xs font-semibold text-white"
          >
            Compare
          </button>
          {compareResult && (
            <div className="rounded-lg border border-[#2a3158] bg-[#12172e] px-3 py-2 text-xs text-slate-300">
              <p>Changed: {compareResult.summary.changed}</p>
              <p>Added: {compareResult.summary.added}</p>
              <p>Removed: {compareResult.summary.removed}</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && <p className="text-xs text-slate-500">Loading versions...</p>}
          {!loading && versions.length === 0 && <p className="text-xs text-slate-500">No versions yet.</p>}
          {versions.map((version) => (
            <div key={version._id} className="rounded-lg border border-[#2a3158] bg-[#12172e] px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Version {version.versionNumber}</p>
                <button
                  onClick={() => void restoreVersion(version._id)}
                  disabled={restoringId === version._id}
                  className="text-xs px-2 py-1 rounded-md bg-[#22347f] text-slate-100 hover:bg-[#2c439a] flex items-center gap-1 disabled:opacity-60"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">{version.description || "AI update"}</p>
              <p className="text-[11px] text-slate-500 mt-1">{new Date(version.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

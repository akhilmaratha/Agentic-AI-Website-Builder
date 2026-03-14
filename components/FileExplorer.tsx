"use client";

import { useState } from "react";
import {
  ChevronRight, ChevronDown,
  FileCode2, FileJson, FileCog, FileType2, File,
  FolderOpen, Folder,
} from "lucide-react";
import { useBuilderStore, type FileNode } from "@/store/useBuilderStore";

// ──────────────────────────────────────────────
// Icon helpers
// ──────────────────────────────────────────────
function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, React.ElementType> = {
    tsx: FileCode2, ts: FileCode2,
    jsx: FileCode2, js: FileCode2,
    json: FileJson,
    css: FileCog,
    html: FileType2,
  };
  const Icon = map[ext] ?? File;

  const colorMap: Record<string, string> = {
    tsx: "text-blue-400", ts: "text-blue-400",
    jsx: "text-amber-400", js: "text-amber-400",
    json: "text-yellow-400",
    css: "text-purple-400",
    html: "text-orange-400",
  };

  return <Icon className={`w-3.5 h-3.5 shrink-0 ${colorMap[ext] ?? "text-slate-500"}`} />;
}

// ──────────────────────────────────────────────
// Recursive tree node
// ──────────────────────────────────────────────
function TreeNode({
  node,
  depth = 0,
  parentPath = "",
}: {
  node: FileNode;
  depth?: number;
  parentPath?: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { activeFile, setActiveFile, setRightTab } = useBuilderStore();

  const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const isActive = activeFile === fullPath;

  const handleClick = () => {
    if (node.type === "folder") {
      setExpanded((e) => !e);
    } else {
      setActiveFile(fullPath);
      setRightTab("code");
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`w-full flex items-center gap-2 py-1.5 pr-4 text-[12px] font-medium transition-all rounded-md group ${
          isActive
            ? "bg-[#2547f4]/15 text-[#2547f4] border-l-2 border-[#2547f4]"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
        }`}
      >
        {/* Folder expand icon */}
        {node.type === "folder" ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          )
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" /> // spacer
        )}

        {/* Icon */}
        {node.type === "folder" ? (
          expanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[#2547f4]" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          )
        ) : (
          <FileIcon name={node.name} />
        )}

        {/* Name */}
        <span className="truncate">{node.name}</span>
      </button>

      {/* Children */}
      {node.type === "folder" && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              depth={depth + 1}
              parentPath={fullPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// File Explorer root
// ──────────────────────────────────────────────
export default function FileExplorer() {
  const { fileTree } = useBuilderStore();

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Explorer
        </span>
        <span className="text-[10px] text-slate-600">
          {fileTree.length} item{fileTree.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tree */}
      <div className="space-y-0.5">
        {fileTree.map((node) => (
          <TreeNode key={node.name} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

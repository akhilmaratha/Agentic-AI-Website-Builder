import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type MessageRole = "user" | "ai";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  code?: string;
  filename?: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
  language?: string;
}

// ─────────────────────────────────────────────
// State interface
// ─────────────────────────────────────────────
export interface BuilderState {
  // ── User prompt (from landing page) ──────────
  prompt: string;
  setPrompt: (prompt: string) => void;

  // ── Project ───────────────────────────────────
  projectId: string;
  setProjectId: (id: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  resetProjectState: () => void;

  // ── Chat messages ─────────────────────────────
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateLastMessage: (content: string, code?: string, filename?: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;

  // ── Generated files (path → code) ────────────
  files: Record<string, string>;
  setFiles: (files: Record<string, string>) => void;
  updateFiles: (files: Record<string, string>) => void;
  setFileContent: (path: string, content: string) => void;

  // ── Active file in code panel ─────────────────
  activeFile: string;
  setActiveFile: (file: string) => void;

  // ── Preview HTML (for iframe) ─────────────────
  previewHTML: string;
  updatePreview: (html: string) => void;

  // ── Right-panel tab ───────────────────────────
  rightTab: "code" | "files" | "terminal";
  setRightTab: (tab: "code" | "files" | "terminal") => void;

  // ── Preview viewport ──────────────────────────
  viewport: "desktop" | "tablet" | "mobile";
  setViewport: (v: "desktop" | "tablet" | "mobile") => void;

  // ── File tree (sidebar explorer) ──────────────
  fileTree: FileNode[];
  setFileTree: (tree: FileNode[]) => void;
  addFileNode: (path: string, content: string, language?: string) => void;

  // ── Terminal logs ─────────────────────────────
  terminalLogs: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;

  // ── Loading/streaming ─────────────────────────
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

// ─────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────
const DEFAULT_CODE = "";
const DEFAULT_PREVIEW_HTML = "";

const DEFAULT_FILES: Record<string, string> = {};

const DEFAULT_FILE_TREE: FileNode[] = [];

const DEFAULT_LOGS: string[] = [];

// ─────────────────────────────────────────────
// Helper: convert flat file map → FileNode tree
// ─────────────────────────────────────────────
function pathsToTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      let existing = current.find((n) => n.name === part);
      if (!existing) {
        existing = isFile
          ? { name: part, type: "file", content, language: inferLanguage(part) }
          : { name: part, type: "folder", children: [] };
        current.push(existing);
      }
      if (!isFile && existing.children) {
        current = existing.children;
      }
    }
  }

  return root;
}

function inferLanguage(filename: string): string {
  const ext = filename.split(".").pop() ?? "";
  const map: Record<string, string> = {
    tsx: "typescript", ts: "typescript", jsx: "javascript", js: "javascript",
    css: "css", json: "json", html: "html", md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      // ── Prompt ───────────────────────────────
      prompt: "",
      setPrompt: (prompt) => set({ prompt }),

      // ── Project ──────────────────────────────
      projectId: "",
      setProjectId: (projectId) => set({ projectId }),
      projectName: "My AI Project",
      setProjectName: (projectName) => set({ projectName }),
      resetProjectState: () =>
        set({
          messages: [],
          files: {},
          activeFile: "",
          previewHTML: "",
          fileTree: [],
          rightTab: "code",
          isGenerating: false,
          terminalLogs: [],
          viewport: "desktop",
        }),

      // ── Messages ─────────────────────────────
      messages: [],
      addMessage: (message) => {
        const newMsg: ChatMessage = {
          ...message,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, newMsg] }));
      },
      updateLastMessage: (content, code, filename) => {
        set((s) => {
          const msgs = [...s.messages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content,
              code,
              filename,
              isStreaming: false,
            };
          }
          return { messages: msgs };
        });
      },
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),

      // ── Files ─────────────────────────────────
      files: DEFAULT_FILES,
      setFiles: (files) => {
        const tree = pathsToTree(files);
        const firstFile = Object.keys(files)[0] ?? "";
        set({ files, fileTree: tree, activeFile: firstFile });
      },
      updateFiles: (newFiles) => {
        set((s) => {
          const merged = { ...s.files, ...newFiles };
          const tree = pathsToTree(merged);
          // Set active file to first new file
          const firstNew = Object.keys(newFiles)[0];
          return {
            files: merged,
            fileTree: tree,
            activeFile: firstNew ?? s.activeFile,
          };
        });
      },
      setFileContent: (path, content) => {
        set((s) => ({
          files: { ...s.files, [path]: content },
        }));
      },

      // ── Active file ──────────────────────────
      activeFile: "",
      setActiveFile: (activeFile) => set({ activeFile }),

      // ── Preview HTML ─────────────────────────
      previewHTML: DEFAULT_PREVIEW_HTML,
      updatePreview: (previewHTML) => set({ previewHTML }),

      // ── Right tab ────────────────────────────
      rightTab: "code",
      setRightTab: (rightTab) => set({ rightTab }),

      // ── Viewport ─────────────────────────────
      viewport: "desktop",
      setViewport: (viewport) => set({ viewport }),

      // ── File tree ─────────────────────────────
      fileTree: DEFAULT_FILE_TREE,
      setFileTree: (fileTree) => set({ fileTree }),
      addFileNode: (path, content, language) => {
        set((s) => {
          const newFiles = { ...s.files, [path]: content };
          return {
            files: newFiles,
            fileTree: pathsToTree(newFiles),
          };
        });
        void language; // suppress unused warning
      },

      // ── Terminal ──────────────────────────────
      terminalLogs: DEFAULT_LOGS,
      addLog: (log) => set((s) => ({ terminalLogs: [...s.terminalLogs, log] })),
      clearLogs: () => set({ terminalLogs: [] }),

      // ── Generating flag ───────────────────────
      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),
    }),
    {
      name: "agentic-builder-store",
      partialize: (state) => ({
        prompt: state.prompt,
        projectId: state.projectId,
        projectName: state.projectName,
        files: state.files,
        previewHTML: state.previewHTML,
        activeFile: state.activeFile,
        messages: state.messages,
        fileTree: state.fileTree,
      }),
    }
  )
);

// ─────────────────────────────────────────────
// Agent base types
// ─────────────────────────────────────────────
export interface AgentContext {
  prompt: string;
  requirements?: StructuredRequirements;
  plan?: BuildPlan;
  componentStructure?: ComponentStructure;
  generatedFiles?: Record<string, string>;
  debugReport?: DebugReport;
  previewHTML?: string;
  errors: string[];
  logs: string[];
}

export interface StructuredRequirements {
  projectType: string;
  pages: string[];
  components: string[];
  features: string[];
  colorScheme: string;
  typography: string;
  layout: string;
}

export interface BuildPlan {
  steps: BuildStep[];
  estimatedComponents: number;
  complexity: "simple" | "medium" | "complex";
}

export interface BuildStep {
  order: number;
  task: string;
  agent: string;
  input: string;
  output: string;
}

export interface ComponentStructure {
  pages: PageLayout[];
  sharedComponents: string[];
  styles: string[];
}

export interface PageLayout {
  name: string;
  route: string;
  components: string[];
  layout: string;
}

export interface DebugReport {
  issues: DebugIssue[];
  fixed: number;
  remaining: number;
}

export interface DebugIssue {
  file: string;
  line?: number;
  type: "error" | "warning" | "suggestion";
  message: string;
  fixed: boolean;
}

export type AgentFn = (ctx: AgentContext) => Promise<AgentContext>;

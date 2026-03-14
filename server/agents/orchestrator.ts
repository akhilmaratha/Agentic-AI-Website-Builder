import type { AgentContext, AgentFn } from "./types";
import { requirementAgent } from "./requirementAgent";
import { planningAgent } from "./planningAgent";
import { uiGeneratorAgent } from "./uiGeneratorAgent";
import { codeGeneratorAgent } from "./codeGeneratorAgent";
import { debugAgent } from "./debugAgent";
import { deploymentAgent } from "./deploymentAgent";

export interface OrchestratorResult {
  success: boolean;
  files: Record<string, string>;
  previewHTML: string;
  logs: string[];
  errors: string[];
  debugReport?: {
    issues: number;
    fixed: number;
    remaining: number;
  };
  plan?: {
    steps: number;
    complexity: string;
  };
  requirements?: {
    projectType: string;
    components: string[];
    pages: string[];
  };
}

/**
 * Agent Orchestrator
 * Runs agents in sequence: Requirement → Planning → UI → Code → Debug → Deploy
 */
export async function runAgentPipeline(
  prompt: string,
  options?: { skipDeployment?: boolean }
): Promise<OrchestratorResult> {
  // Initialize context
  const ctx: AgentContext = {
    prompt,
    errors: [],
    logs: [`[Orchestrator] Starting pipeline for: "${prompt.slice(0, 80)}..."`],
  };

  // Define agent pipeline
  const pipeline: { name: string; fn: AgentFn }[] = [
    { name: "RequirementAgent", fn: requirementAgent },
    { name: "PlanningAgent", fn: planningAgent },
    { name: "UIGeneratorAgent", fn: uiGeneratorAgent },
    { name: "CodeGeneratorAgent", fn: codeGeneratorAgent },
    { name: "DebugAgent", fn: debugAgent },
  ];

  // Optionally add deployment
  if (!options?.skipDeployment) {
    pipeline.push({ name: "DeploymentAgent", fn: deploymentAgent });
  }

  // Run agents sequentially
  let currentCtx = ctx;
  for (const agent of pipeline) {
    try {
      ctx.logs.push(`[Orchestrator] Running ${agent.name}...`);
      const startTime = Date.now();
      currentCtx = await agent.fn(currentCtx);
      const elapsed = Date.now() - startTime;
      ctx.logs.push(`[Orchestrator] ${agent.name} completed in ${elapsed}ms`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      ctx.errors.push(`[${agent.name}] Fatal error: ${errorMsg}`);
      ctx.logs.push(`[Orchestrator] ❌ ${agent.name} failed: ${errorMsg}`);
      break; // Stop pipeline on fatal error
    }
  }

  ctx.logs.push(
    `[Orchestrator] Pipeline complete. ${Object.keys(currentCtx.generatedFiles ?? {}).length} files, ${ctx.errors.length} errors`
  );

  return {
    success: ctx.errors.length === 0,
    files: currentCtx.generatedFiles ?? {},
    previewHTML: currentCtx.previewHTML ?? "",
    logs: ctx.logs,
    errors: ctx.errors,
    debugReport: currentCtx.debugReport
      ? {
          issues: currentCtx.debugReport.issues.length,
          fixed: currentCtx.debugReport.fixed,
          remaining: currentCtx.debugReport.remaining,
        }
      : undefined,
    plan: currentCtx.plan
      ? {
          steps: currentCtx.plan.steps.length,
          complexity: currentCtx.plan.complexity,
        }
      : undefined,
    requirements: currentCtx.requirements
      ? {
          projectType: currentCtx.requirements.projectType,
          components: currentCtx.requirements.components,
          pages: currentCtx.requirements.pages,
        }
      : undefined,
  };
}

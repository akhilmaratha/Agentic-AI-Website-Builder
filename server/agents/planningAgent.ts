import type { AgentContext, BuildPlan, BuildStep } from "./types";

/**
 * Planning Agent
 * Creates a step-by-step build plan from requirements.
 */
export async function planningAgent(ctx: AgentContext): Promise<AgentContext> {
  ctx.logs.push("[PlanningAgent] Creating build plan...");

  if (!ctx.requirements) {
    ctx.errors.push("[PlanningAgent] No requirements found");
    return ctx;
  }

  const req = ctx.requirements;
  const steps: BuildStep[] = [];
  let order = 1;

  // Step 1: Always create layout / nav
  steps.push({
    order: order++,
    task: "Create navigation component",
    agent: "UIGenerator",
    input: `Navbar for ${req.projectType}`,
    output: "src/components/Navbar.tsx",
  });

  // Step 2: Create each page component
  for (const component of req.components) {
    if (component === "Navbar") continue; // already handled
    steps.push({
      order: order++,
      task: `Create ${component} component`,
      agent: "CodeGenerator",
      input: `${component} for ${req.projectType} with ${req.colorScheme}`,
      output: `src/components/${component}.tsx`,
    });
  }

  // Step 3: Create page assemblies
  for (const page of req.pages) {
    steps.push({
      order: order++,
      task: `Assemble ${page} page`,
      agent: "CodeGenerator",
      input: `Page ${page} using components: ${req.components.join(", ")}`,
      output: `src/pages/${page}.tsx`,
    });
  }

  // Step 4: Debug pass
  steps.push({
    order: order++,
    task: "Run debug check on all generated files",
    agent: "DebugAgent",
    input: "All generated files",
    output: "debug-report.json",
  });

  // Determine complexity
  const totalItems = req.components.length + req.pages.length;
  const complexity = totalItems <= 5 ? "simple" : totalItems <= 10 ? "medium" : "complex";

  const plan: BuildPlan = {
    steps,
    estimatedComponents: req.components.length,
    complexity,
  };

  ctx.plan = plan;
  ctx.logs.push(`[PlanningAgent] ✓ ${steps.length} steps planned, complexity: ${complexity}`);

  return ctx;
}

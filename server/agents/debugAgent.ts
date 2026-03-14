import type { AgentContext, DebugReport, DebugIssue } from "./types";

/**
 * Debug Agent
 * Detects and fixes common errors in generated code.
 */
export async function debugAgent(ctx: AgentContext): Promise<AgentContext> {
  ctx.logs.push("[DebugAgent] Running diagnostics...");

  if (!ctx.generatedFiles) {
    ctx.errors.push("[DebugAgent] No generated files to debug");
    return ctx;
  }

  const issues: DebugIssue[] = [];
  const files = ctx.generatedFiles;

  for (const [filePath, code] of Object.entries(files)) {
    // Check: missing React import in .tsx files
    if (filePath.endsWith(".tsx") && !code.includes("import React")) {
      issues.push({
        file: filePath,
        type: "error",
        message: "Missing React import",
        fixed: true,
      });
      files[filePath] = `import React from 'react';\n${code}`;
    }

    // Check: missing export default
    if (filePath.endsWith(".tsx") && !code.includes("export default") && !code.includes("export {")) {
      const componentName = filePath.split("/").pop()?.replace(".tsx", "") ?? "Component";
      issues.push({
        file: filePath,
        type: "error",
        message: `Missing default export for ${componentName}`,
        fixed: true,
      });
      files[filePath] = `${code}\nexport default ${componentName};\n`;
    }

    // Check: unclosed JSX tags (basic heuristic)
    const openDivs = (code.match(/<div/g) || []).length;
    const closeDivs = (code.match(/<\/div>/g) || []).length;
    if (openDivs > closeDivs) {
      issues.push({
        file: filePath,
        type: "warning",
        message: `Potentially unclosed <div> tags (${openDivs} open, ${closeDivs} close)`,
        fixed: false,
      });
    }

    // Check: empty components
    if (filePath.endsWith(".tsx") && code.trim().length < 50) {
      issues.push({
        file: filePath,
        type: "warning",
        message: "Component appears to be empty or minimal",
        fixed: false,
      });
    }

    // Check: inline styles that should be Tailwind
    const inlineStyleCount = (code.match(/style={{/g) || []).length;
    if (inlineStyleCount > 3) {
      issues.push({
        file: filePath,
        type: "suggestion",
        message: `${inlineStyleCount} inline styles detected — consider using Tailwind classes`,
        fixed: false,
      });
    }

    // Check: hardcoded colors
    if (code.includes("#000000") || code.includes("rgb(0,0,0)")) {
      issues.push({
        file: filePath,
        type: "suggestion",
        message: "Hardcoded black color — use Tailwind's color system instead",
        fixed: false,
      });
    }

    // Check: missing key prop in .map()
    const mapCalls = code.match(/\.map\(/g) || [];
    const keyCalls = code.match(/key={/g) || [];
    if (mapCalls.length > keyCalls.length) {
      issues.push({
        file: filePath,
        type: "warning",
        message: "Possible missing key prop in .map() call",
        fixed: false,
      });
    }
  }

  const fixedCount = issues.filter((i) => i.fixed).length;

  const report: DebugReport = {
    issues,
    fixed: fixedCount,
    remaining: issues.length - fixedCount,
  };

  ctx.debugReport = report;
  ctx.generatedFiles = files;
  ctx.logs.push(
    `[DebugAgent] ✓ Found ${issues.length} issues, auto-fixed ${fixedCount}`
  );

  return ctx;
}

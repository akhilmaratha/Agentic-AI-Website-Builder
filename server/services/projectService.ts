import path from "path";
import fs from "fs-extra";

const WORKSPACE_ROOT = path.join(process.cwd(), "workspace");

/**
 * Project Service
 * Manages project workspaces and file operations.
 */
export class ProjectService {
  /**
   * Save files to a project workspace.
   */
  async saveFiles(
    projectId: string,
    files: Record<string, string>
  ): Promise<{ projectPath: string; fileCount: number }> {
    const projectPath = this.getProjectPath(projectId);

    // Validate: prevent path traversal
    if (!projectPath.startsWith(WORKSPACE_ROOT)) {
      throw new Error("Invalid project path — path traversal detected");
    }

    await fs.ensureDir(projectPath);

    let fileCount = 0;
    for (const [filePath, content] of Object.entries(files)) {
      // Sanitize file path
      const sanitized = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
      const fullPath = path.join(projectPath, sanitized);

      // Ensure it's still within the project
      if (!fullPath.startsWith(projectPath)) {
        console.warn(`Skipping unsafe path: ${filePath}`);
        continue;
      }

      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, "utf-8");
      fileCount++;
    }

    return { projectPath, fileCount };
  }

  /**
   * Read all files from a project workspace.
   */
  async readFiles(projectId: string): Promise<Record<string, string>> {
    const projectPath = this.getProjectPath(projectId);

    if (!(await fs.pathExists(projectPath))) {
      return {};
    }

    const files: Record<string, string> = {};
    await this.walkDir(projectPath, projectPath, files);
    return files;
  }

  /**
   * Read a single file from a project.
   */
  async readFile(projectId: string, filePath: string): Promise<string | null> {
    const fullPath = path.join(this.getProjectPath(projectId), filePath);

    if (!(await fs.pathExists(fullPath))) return null;
    return fs.readFile(fullPath, "utf-8");
  }

  /**
   * Delete a project workspace.
   */
  async deleteProject(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    if (await fs.pathExists(projectPath)) {
      await fs.remove(projectPath);
    }
  }

  /**
   * List all projects in the workspace.
   */
  async listProjects(): Promise<string[]> {
    await fs.ensureDir(WORKSPACE_ROOT);
    const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }

  /**
   * Get the filesystem path for a project.
   */
  getProjectPath(projectId: string): string {
    // Sanitize project ID
    const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "");
    return path.join(WORKSPACE_ROOT, safeId);
  }

  /** Recursively read all files in a directory */
  private async walkDir(
    dir: string,
    root: string,
    files: Record<string, string>
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .next, .git
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;

      if (entry.isDirectory()) {
        await this.walkDir(fullPath, root, files);
      } else {
        const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
        files[relativePath] = await fs.readFile(fullPath, "utf-8");
      }
    }
  }
}

export const projectService = new ProjectService();

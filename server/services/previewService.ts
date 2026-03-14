import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs-extra";

const WORKSPACE_ROOT = path.join(process.cwd(), "workspace");

interface PreviewInstance {
  projectId: string;
  port: number;
  process: ChildProcess;
  url: string;
  startedAt: Date;
}

/**
 * Preview Service
 * Manages dev servers for project previews.
 */
export class PreviewService {
  private instances: Map<string, PreviewInstance> = new Map();
  private nextPort = 3010;

  /**
   * Start a preview server for a project.
   */
  async startPreview(projectId: string): Promise<{ previewUrl: string; port: number }> {
    // Check if already running
    const existing = this.instances.get(projectId);
    if (existing) {
      return { previewUrl: existing.url, port: existing.port };
    }

    const projectPath = path.join(WORKSPACE_ROOT, projectId);

    if (!(await fs.pathExists(projectPath))) {
      throw new Error(`Project ${projectId} not found`);
    }

    const port = this.nextPort++;
    const previewUrl = `http://localhost:${port}`;

    // Check if package.json exists
    const hasPackageJson = await fs.pathExists(path.join(projectPath, "package.json"));

    if (!hasPackageJson) {
      // Return a static preview URL for projects without build setup
      return { previewUrl: `${previewUrl}/preview.html`, port };
    }

    // Start dev server
    const proc = spawn("npx", ["next", "dev", "-p", String(port)], {
      cwd: projectPath,
      stdio: "pipe",
      shell: true,
    });

    const instance: PreviewInstance = {
      projectId,
      port,
      process: proc,
      url: previewUrl,
      startedAt: new Date(),
    };

    this.instances.set(projectId, instance);

    // Handle process lifecycle
    proc.on("exit", () => {
      this.instances.delete(projectId);
    });

    proc.on("error", (err) => {
      console.error(`Preview server error for ${projectId}:`, err);
      this.instances.delete(projectId);
    });

    return { previewUrl, port };
  }

  /**
   * Stop a preview server.
   */
  async stopPreview(projectId: string): Promise<void> {
    const instance = this.instances.get(projectId);
    if (instance) {
      instance.process.kill("SIGTERM");
      this.instances.delete(projectId);
    }
  }

  /**
   * Stop all preview servers.
   */
  async stopAll(): Promise<void> {
    for (const [id] of this.instances) {
      await this.stopPreview(id);
    }
  }

  /**
   * List all running preview instances.
   */
  listPreviews(): Array<{ projectId: string; url: string; port: number; startedAt: Date }> {
    return Array.from(this.instances.values()).map((i) => ({
      projectId: i.projectId,
      url: i.url,
      port: i.port,
      startedAt: i.startedAt,
    }));
  }

  /**
   * Get preview URL for a project.
   */
  getPreviewUrl(projectId: string): string | null {
    return this.instances.get(projectId)?.url ?? null;
  }
}

export const previewService = new PreviewService();

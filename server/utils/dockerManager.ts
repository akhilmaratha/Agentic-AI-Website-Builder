import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";

const WORKSPACE_ROOT = path.join(process.cwd(), "workspace");

/**
 * Docker Manager
 * Secure Docker sandbox system for running AI-generated Next.js projects.
 */
export class DockerManager {
  private nextPort = 3010;
  private runningContainers: Map<string, { containerId: string; port: number }> = new Map();

  /**
   * Initializes a project container.
   * 1. Creates Dockerfile if not exists
   * 2. Builds image
   * 3. Runs container with dynamic port
   */
  async startSandboxPreview(projectId: string): Promise<{ previewUrl: string; port: number }> {
    const projectPath = path.join(WORKSPACE_ROOT, projectId);

    if (!(await fs.pathExists(projectPath))) {
      throw new Error(`Project workspace not found: ${projectId}`);
    }

    // 1. Ensure Dockerfile exists in the specific user's project
    await this.createDockerfile(projectPath);

    const imageName = `agentic-project-${projectId.toLowerCase()}`;
    
    // 2. Build the Docker image natively
    console.log(`[Docker] Building image for ${projectId}...`);
    await this.runCommand("docker", ["build", "-t", imageName, "."], projectPath);

    // 3. Assign dynamic port and run container
    const port = this.nextPort++;
    const containerName = `preview-${projectId}`;

    // Stop existing if running
    if (this.runningContainers.has(projectId)) {
      await this.stopSandbox(projectId);
    }

    console.log(`[Docker] Starting container ${containerName} on port ${port}...`);
    await this.runCommand(
      "docker", 
      [
        "run", "-d", 
        "--name", containerName, 
        "-p", `${port}:3000`, 
        // Security opts: memory limit, no root access if configured
        "--memory=512m", 
        imageName
      ], 
      projectPath
    );

    this.runningContainers.set(projectId, { containerId: containerName, port });

    return {
      previewUrl: `http://localhost:${port}`,
      port
    };
  }

  /**
   * Stops and removes a running preview sandbox.
   */
  async stopSandbox(projectId: string) {
    const containerName = `preview-${projectId}`;
    console.log(`[Docker] Stopping container ${containerName}...`);
    
    try {
      await this.runCommand("docker", ["stop", containerName], WORKSPACE_ROOT);
      await this.runCommand("docker", ["rm", containerName], WORKSPACE_ROOT);
    } catch (err) {
      console.error(`Failed to stop/remove container: ${err}`);
    }

    this.runningContainers.delete(projectId);
  }

  private async createDockerfile(projectPath: string) {
    const dockerfilePath = path.join(projectPath, "Dockerfile");
    const content = `
FROM node:18-alpine
WORKDIR /app

# Copy package.json to install dependencies first (caching)
COPY package.json ./
RUN npm install

# Copy rest of the files
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
`.trim();

    await fs.writeFile(dockerfilePath, content, "utf-8");
  }

  private runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { cwd });
      let out = "";
      proc.stdout.on("data", (data) => (out += data.toString()));
      proc.stderr.on("data", (data) => (out += data.toString()));
      
      proc.on("close", (code) => {
        if (code === 0) resolve(out);
        else reject(new Error(`Command ${cmd} ${args.join(" ")} failed.\n${out}`));
      });
    });
  }
}

export const dockerManager = new DockerManager();

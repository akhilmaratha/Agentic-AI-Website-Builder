import type { AgentContext } from "./types";

/**
 * Deployment Agent
 * Prepares project for deployment.
 */
export async function deploymentAgent(ctx: AgentContext): Promise<AgentContext> {
  ctx.logs.push("[DeploymentAgent] Preparing for deployment...");

  if (!ctx.generatedFiles) {
    ctx.errors.push("[DeploymentAgent] No files to deploy");
    return ctx;
  }

  // Add deployment configs
  const files = ctx.generatedFiles;

  // Vercel config
  files["vercel.json"] = JSON.stringify(
    {
      framework: "nextjs",
      buildCommand: "next build",
      outputDirectory: ".next",
      regions: ["iad1"],
      env: {
        NODE_ENV: "production",
      },
    },
    null,
    2
  );

  // Dockerfile
  files["Dockerfile"] = `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
`;

  // .dockerignore
  files[".dockerignore"] = `node_modules\n.next\n.git\n*.log\n.env*\n`;

  // .gitignore
  files[".gitignore"] = `node_modules/\n.next/\n.env.local\n*.log\n.DS_Store\n`;

  // CI config (GitHub Actions)
  files[".github/workflows/deploy.yml"] = `name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
`;

  ctx.generatedFiles = files;
  ctx.logs.push(
    `[DeploymentAgent] ✓ Added deployment configs (Vercel, Docker, CI)`
  );

  return ctx;
}

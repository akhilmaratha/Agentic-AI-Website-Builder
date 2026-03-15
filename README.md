# Agentic AI Website Builder

AI-first website builder built with Next.js App Router, TypeScript, Tailwind CSS, MongoDB, and OpenRouter.

This README documents the full product flow, page map, API map, and how generation moves from user prompt to live preview and persisted project versions.

## What This App Does

- Authenticated users create and manage website projects.
- Users chat with AI to generate or edit website UI/code.
- The app updates code files, chat history, and a live preview panel.
- Projects support folders, duplication, version snapshots, compare, and restore.
- Plans and billing are handled with Razorpay (with mock fallback support).

## Tech Stack

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Auth: NextAuth (Google + GitHub)
- Database: MongoDB (Mongoose)
- AI Provider: OpenRouter compatible chat-completions API
- State: Zustand

## Quick Start

1. Install dependencies.
2. Configure environment variables.
3. Start dev server.

Commands:

- npm install
- npm run dev

Open http://localhost:3000

## User Pages

- [app/page.tsx](app/page.tsx): Marketing landing page with product intro and CTA into builder.
- [app/login/page.tsx](app/login/page.tsx): OAuth login page for Google/GitHub.
- [app/builder/page.tsx](app/builder/page.tsx): Main AI builder workspace (chat, preview, files, code, terminal, version history).
- [app/dashboard/page.tsx](app/dashboard/page.tsx): User dashboard with project/generation summary.
- [app/projects/page.tsx](app/projects/page.tsx): Project listing, search, and management.
- [app/pricing/page.tsx](app/pricing/page.tsx): Plan tiers and upgrade CTA.
- [app/billing/page.tsx](app/billing/page.tsx): Billing/subscription status and payment actions.
- [app/profile/page.tsx](app/profile/page.tsx): Profile and plan information.

## API Routes

### Authentication

- [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts)
	- NextAuth entry route.
	- Handles OAuth, JWT/session callbacks, and user bootstrap.

### AI Generation and Chat

- [app/api/chat/route.ts](app/api/chat/route.ts)
	- Method: POST
	- Main AI endpoint for conversational generation/editing.
	- Input: message/prompt, messages history, projectId, projectContext.
	- Output: type, reply, files, preview, filename, code.
	- Handles rate limits, generation limits, AI call/retry, response parsing, preview construction, and project persistence side-effects.

- [app/api/generate/route.ts](app/api/generate/route.ts)
	- Method: POST
	- Agent pipeline generation endpoint (requirement/planning/ui/code/debug/deploy stages).

- [app/api/agents/route.ts](app/api/agents/route.ts)
	- Method: POST
	- Exposes orchestrator pipeline execution over HTTP.

- [app/api/generation-status/route.ts](app/api/generation-status/route.ts)
	- Method: GET
	- Returns current usage and generation allowance by plan.

### Projects

- [app/api/projects/route.ts](app/api/projects/route.ts)
	- Methods: GET, POST
	- GET: list user projects or fetch by query filters.
	- POST: create project with plan-aware caps.

- [app/api/projects/[projectId]/route.ts](app/api/projects/[projectId]/route.ts)
	- Methods: GET, PATCH, DELETE
	- GET: single project.
	- PATCH: update project metadata.
	- DELETE: soft delete project and related entities.

- [app/api/projects/[projectId]/files/route.ts](app/api/projects/[projectId]/files/route.ts)
	- Method: GET
	- Returns project files map.

- [app/api/projects/[projectId]/messages/route.ts](app/api/projects/[projectId]/messages/route.ts)
	- Method: GET
	- Returns project-scoped chat history.

- [app/api/projects/[projectId]/duplicate/route.ts](app/api/projects/[projectId]/duplicate/route.ts)
	- Method: POST
	- Duplicates project, files, and message history.

### Versioning

- [app/api/projects/[projectId]/versions/route.ts](app/api/projects/[projectId]/versions/route.ts)
	- Method: GET
	- Lists version snapshots.

- [app/api/projects/[projectId]/versions/compare/route.ts](app/api/projects/[projectId]/versions/compare/route.ts)
	- Method: POST
	- Compares two snapshots and returns added/removed/changed file summary.

- [app/api/projects/[projectId]/versions/restore/route.ts](app/api/projects/[projectId]/versions/restore/route.ts)
	- Method: POST
	- Restores files from selected snapshot.

### Folders

- [app/api/folders/route.ts](app/api/folders/route.ts)
	- Methods: GET, POST
	- Lists folders or creates folder.

- [app/api/folders/[folderId]/route.ts](app/api/folders/[folderId]/route.ts)
	- Methods: PATCH, DELETE
	- Updates folder metadata or deletes folder.

### Message History

- [app/api/messages/route.ts](app/api/messages/route.ts)
	- Methods: GET, DELETE
	- Global user chat history fetch/clear.

### Project File-System Preview/Save

- [app/api/project/save/route.ts](app/api/project/save/route.ts)
	- Methods: GET, POST
	- Reads project files from workspace and writes generated files to workspace.

- [app/api/project/preview/route.ts](app/api/project/preview/route.ts)
	- Methods: GET, POST, DELETE
	- Starts/stops/lists preview server instances per project.

### Deployment

- [app/api/deploy/route.ts](app/api/deploy/route.ts)
	- Method: POST
	- Deployment endpoint (currently placeholder/mock URL behavior).

### Payment

- [app/api/payment/create-order/route.ts](app/api/payment/create-order/route.ts)
	- Method: POST
	- Creates Razorpay order for upgrades.

- [app/api/payment/verify/route.ts](app/api/payment/verify/route.ts)
	- Method: POST
	- Verifies payment signature and upgrades user plan/subscription state.

## End-to-End AI Builder Flow

1. User opens [app/builder/page.tsx](app/builder/page.tsx) and enters a prompt in ChatPanel.
2. ChatPanel sends POST request to [app/api/chat/route.ts](app/api/chat/route.ts) with:
	 - latest user message
	 - full chat history
	 - current projectId
	 - project context (current file + file map)
3. Server route applies:
	 - auth + plan checks
	 - per-minute rate limits
	 - daily generation limits
4. Server prepares model payload and calls OpenRouter chat completions.
5. Server parses model JSON response into the app response schema.
6. If preview HTML is missing, server builds preview from generated code.
7. Response returns to client with:
	 - assistant reply text
	 - generated/updated files
	 - preview HTML
8. Client updates Zustand store:
	 - messages updated
	 - files merged
	 - active file selected
	 - preview iframe refreshed
9. On authenticated project sessions, backend persists:
	 - chat messages
	 - files
	 - version snapshot
	 - project metadata (updatedAt, previewHTML, optional generated name)

## Builder UI Data Flow

- [components/ChatPanel.tsx](components/ChatPanel.tsx)
	- Sends user prompts and receives AI responses.

- [store/useBuilderStore.ts](store/useBuilderStore.ts)
	- Central client state for messages, files, previewHTML, active file, logs, and generation status.

- [components/FileExplorer.tsx](components/FileExplorer.tsx)
	- Renders file tree from store files map.

- [components/CodePanel.tsx](components/CodePanel.tsx)
	- Displays/edits selected file content.

- [components/PreviewPanel.tsx](components/PreviewPanel.tsx)
	- Renders live iframe preview from store previewHTML.

- [components/TerminalPanel.tsx](components/TerminalPanel.tsx)
	- Displays generation and event logs.

- [components/VersionHistoryPanel.tsx](components/VersionHistoryPanel.tsx)
	- Lists snapshots and restore/compare actions.

## AI Prompt System

- Prompt templates and rules are modularized under [ai-engine/prompts](ai-engine/prompts).
- Central mapping for suggestion chips is in [ai-engine/promptMap.ts](ai-engine/promptMap.ts).
- Prompt expansion logic is in [server/services/promptExpansion.ts](server/services/promptExpansion.ts).

## Security and Limits

- Global API throttle and protected-page auth checks are in [middleware.ts](middleware.ts).
- Per-plan request limits and generation caps are enforced in route handlers.
- Project ownership is validated before read/write operations.
- Project deletion uses soft-delete patterns where applicable.

## Data Model Overview

Core entities are defined under [server/models](server/models):

- User
- Project
- FileModel
- ChatMessage
- Version
- Folder
- Subscription

## Notes for Contributors

- Keep API route response shapes consistent with client expectations in ChatPanel/store.
- When adding new templates, update:
	- [ai-engine/prompts/templates](ai-engine/prompts/templates)
	- [ai-engine/prompts/index.ts](ai-engine/prompts/index.ts)
	- [ai-engine/promptMap.ts](ai-engine/promptMap.ts)
- For new protected pages, add matcher coverage in [middleware.ts](middleware.ts).

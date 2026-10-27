# Jarvis — personal AI agent (UI + chat slice)

Next.js 16 / React 19 app styled after the JARVIS HUD design system (dark cyan, amber alert, light "stark" theme).

## Run
```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable chat
npm install
npm run dev
npm run lint && npm run typecheck && npm test && npm run build
```

## What works
- Streaming chat through a server-side route (`/api/chat`); keys never reach the browser. Stop, retry/regenerate, copy, markdown (tables, code).
- Ask and Plan modes (different system prompts).
- **Act mode + approvals.** One tool, `save_note` (writes a .md file to `.data/notes/`). The model can only *propose* a call; it is validated and stored as a pending approval. Only `POST /api/approvals/:id` executes, using the server-stored input (client-supplied input is ignored), once, with a 15-minute expiry, same-origin check, 5 s timeout, and no automatic retry. Pending items appear in chat and on the Activity page with the exact input; results show the real file path and size. State and audit log: `.data/agent.json`.
- Model registry (`src/lib/models.ts`): a model shows "Online" only if its key is set **and** an adapter exists. Only Anthropic has an adapter.
- Conversations: create, rename, delete, search, restore (browser localStorage).
- Local tasks with filters and search; dashboard and activity log built from real local data.
- Cmd/Ctrl+K palette, collapsible sidebar, activity rail, mobile drawer, 3 themes, reduced-motion support.

## Not built (honest list)
Gmail/Calendar/Drive, memory, projects, notes, files/attachments, automations/reminders, more tools and multi-step runs, accounts and database persistence, Persian/RTL, message editing, voice.
Conversations/tasks live in this browser; approvals live in `.data/` on the server. There is no auth, so anyone who can reach the server can approve (the same-origin check blocks cross-site forgery, not other users), so `/api/chat` is rate-limited per IP (in memory) but otherwise open: do not deploy it publicly with a real key.

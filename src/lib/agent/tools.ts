import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./store-path";

export interface ToolDef {
  name: string;
  description: string;
  /** JSON schema sent to the model. */
  inputSchema: Record<string, unknown>;
  risk: "write";
  timeoutMs: number;
  validate(input: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string };
  describe(input: Record<string, unknown>): { summary: string; consequences: string };
  execute(input: Record<string, unknown>, ctx: { id: string }): Promise<Record<string, unknown>>;
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "note";
}

const MAX_TITLE = 120;
const MAX_BODY = 10_000;

export const saveNote: ToolDef = {
  name: "save_note",
  description: "Save a markdown note to the user's local notes folder. Requires the user's approval before anything is written.",
  inputSchema: {
    type: "object",
    properties: { title: { type: "string", maxLength: MAX_TITLE }, body: { type: "string", maxLength: MAX_BODY } },
    required: ["title", "body"],
    additionalProperties: false,
  },
  risk: "write",
  timeoutMs: 5000,
  validate(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Input must be an object." };
    const { title, body, ...rest } = input as Record<string, unknown>;
    if (Object.keys(rest).length) return { ok: false, error: "Unexpected fields." };
    if (typeof title !== "string" || !title.trim() || title.length > MAX_TITLE) return { ok: false, error: "Invalid title." };
    if (typeof body !== "string" || !body.trim() || body.length > MAX_BODY) return { ok: false, error: "Invalid body." };
    return { ok: true, value: { title: title.trim(), body } };
  },
  describe(input) {
    return {
      summary: `Save note “${input.title}”`,
      consequences: `Creates one new .md file in .data/notes/ (${String(input.body).length} characters). Nothing is sent anywhere. Existing files are never overwritten.`,
    };
  },
  async execute(input, ctx) {
    const dir = path.resolve(dataDir(), "notes");
    await mkdir(dir, { recursive: true });
    const file = path.resolve(dir, `${slugify(String(input.title))}-${ctx.id.slice(0, 8)}.md`);
    if (!file.startsWith(dir + path.sep)) throw new Error("Resolved path escaped the notes folder.");
    await writeFile(file, `# ${input.title}\n\n${input.body}\n`, { flag: "wx" });
    const { size } = await stat(file);
    return { path: path.relative(process.cwd(), file), bytes: size };
  },
};

export const TOOLS: Record<string, ToolDef> = { [saveNote.name]: saveNote };

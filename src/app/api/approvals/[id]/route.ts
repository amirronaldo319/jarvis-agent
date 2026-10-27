import { decide } from "@/lib/agent/store";
import { sameOrigin } from "@/lib/origin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden", message: "Cross-origin request rejected." }, { status: 403 });
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "bad_request", message: "Invalid JSON." }, { status: 400 }); }
  const decision = (body as { decision?: unknown })?.decision;
  if (decision !== "approve" && decision !== "reject") return Response.json({ error: "bad_request", message: "decision must be approve or reject." }, { status: 400 });
  const r = await decide(id, decision);
  if (!r.ok) return Response.json({ error: r.code, message: r.error, approval: r.approval }, { status: r.code === "not_found" ? 404 : 409 });
  return Response.json({ approval: r.approval });
}

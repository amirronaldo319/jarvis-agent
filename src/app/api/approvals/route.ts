import { connection } from "next/server";
import { list } from "@/lib/agent/store";

export async function GET() {
  await connection();
  return Response.json({ approvals: await list() }, { headers: { "cache-control": "no-store" } });
}

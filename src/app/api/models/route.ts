import { connection } from "next/server";
import { resolveModels } from "@/lib/models";

export async function GET() {
  await connection();
  return Response.json({ models: resolveModels(process.env) });
}

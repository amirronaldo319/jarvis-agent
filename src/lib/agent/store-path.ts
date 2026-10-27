import path from "node:path";

/** Runtime data folder. Deliberately dynamic, so it is excluded from file tracing. */
export function dataDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.AGENT_DATA_DIR || path.join(process.cwd(), ".data"));
}

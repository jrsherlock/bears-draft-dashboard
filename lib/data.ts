import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DraftMeta, DraftPick } from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(PUBLIC_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

export async function loadPicks(): Promise<DraftPick[]> {
  return readJson<DraftPick[]>("bears_draft_history.json");
}

export async function loadMeta(): Promise<DraftMeta> {
  return readJson<DraftMeta>("bears_draft_meta.json");
}

import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import seedJson from "@/demo-data/tournamentos-seed.json";
import { hydrateState } from "@/lib/domain";
import type { SeedData } from "@/lib/types";

const root = process.cwd();
const statePath = path.join(root, ".data", "state.json");

export async function readState() {
  try {
    const stored = JSON.parse(await readFile(statePath, "utf8")) as SeedData;
    return hydrateState(stored);
  } catch {
    const initial = hydrateState(structuredClone(seedJson) as SeedData);
    await writeState(initial);
    return initial;
  }
}

export async function writeState(state: SeedData) {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, statePath);
}

export async function resetState() {
  const initial = hydrateState(structuredClone(seedJson) as SeedData);
  await writeState(initial);
  return initial;
}

export async function mutateState(mutator: (state: Awaited<ReturnType<typeof readState>>) => void) {
  const state = await readState();
  mutator(state);
  await writeState(state);
  return state;
}

import type { Storage } from "./index.js";
export function createSecureSessionStorage(options: {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
  createRevision: () => string;
}): Storage;

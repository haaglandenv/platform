export interface Membership {
  id: string;
  userId: string;
  role: string;
  clubId?: string;
  teamId?: string;
  officialId?: string;
  playerId?: string;
  volunteerId?: string;
  status?: string;
}
export interface Entity {
  id: string;
  [key: string]: unknown;
}
export interface Bootstrap {
  apiVersion: "1";
  version: number;
  mode: "local" | "supabase";
  user: null | { id: string; email?: string; name?: string };
  memberships: Membership[];
  activeMembership: Membership | null;
  capabilities: string[];
  data: Record<string, Entity[]>;
  config: {
    auth: { supabaseUrl: string; publishableKey: string };
    localSessionEnabled: boolean;
  };
}
export interface CommandOptions {
  requestId?: string;
  expectedVersion?: number;
  signal?: AbortSignal;
}
export interface CommandResult {
  ok: true;
  version: number;
  requestId: string;
  result: Record<string, unknown>;
  bootstrap: Bootstrap;
}
export interface MailSettings {
  available: boolean;
  configured: boolean;
  last4: string | null;
  enabled: boolean;
  from: string;
  replyTo: string;
  updatedAt: string | null;
}
export interface Client {
  bootstrap(): Promise<Bootstrap>;
  command(
    type: string,
    payload: Record<string, unknown>,
    options?: CommandOptions,
  ): Promise<CommandResult>;
  localSession(): Promise<Bootstrap>;
  clearLocalSession(): Promise<{ ok: true }>;
  mailSettings(): Promise<MailSettings>;
  updateMailSettings(payload: {
    apiKey?: string;
    clearApiKey?: boolean;
    from?: string;
    replyTo?: string;
    enabled?: boolean;
  }): Promise<MailSettings>;
  testMail(input: {
    to: string;
    requestId?: string;
  }): Promise<{ id: string; status: "accepted" }>;
  readonly version: number | undefined;
}
export class HaagvError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      details?: unknown;
      requestId?: string;
    },
  );
}
export function createHaagvClient(options: {
  origin: string;
  getAccessToken?: () => Promise<string | null>;
  getMembership?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
  createRequestId?: () => string;
  onBootstrap?: (data: Bootstrap) => void;
}): Client;
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface QueuedCommand {
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  membershipId: string;
  requestId: string;
  expectedVersion: number;
  status: "queued" | "received" | "conflict";
  createdAt: string;
  errorCode?: string;
  error?: string;
}
export function createCommandOutbox(options: {
  storage: Storage;
  key?: string;
  createRequestId?: () => string;
}): {
  list(): Promise<QueuedCommand[]>;
  enqueue(input: {
    type: string;
    payload: Record<string, unknown>;
    userId: string;
    membershipId: string;
    expectedVersion: number;
  }): Promise<QueuedCommand>;
  flush(input: {
    client: Client;
    userId: string;
    membershipId: string;
  }): Promise<QueuedCommand[]>;
  remove(requestId: string): Promise<void>;
};

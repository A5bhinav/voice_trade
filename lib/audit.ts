import { appendFileSync } from "fs";
import { join } from "path";

const LOG_PATH = process.env.AUDIT_LOG_PATH
  ? join(process.cwd(), process.env.AUDIT_LOG_PATH.replace(/^\.\//, ""))
  : join(process.cwd(), "audit.jsonl");

interface AuditEntry {
  ts: string;
  type: string;
  session_id?: string;
  payload: unknown;
  result?: unknown;
}

function writeEntry(entry: AuditEntry): void {
  try {
    appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // audit failure must never crash the app
  }
}

export function logCommand(payload: unknown, session_id?: string): void {
  writeEntry({ ts: new Date().toISOString(), type: "command", session_id, payload });
}

export function logExecution(payload: unknown, result: unknown, session_id?: string): void {
  writeEntry({ ts: new Date().toISOString(), type: "execution", session_id, payload, result });
}

export function logPanic(payload: unknown, result?: unknown): void {
  writeEntry({ ts: new Date().toISOString(), type: "panic", payload, result });
}

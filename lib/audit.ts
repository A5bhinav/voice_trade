/**
 * Append-only JSONL audit logger (A3)
 * Writes to AUDIT_LOG_PATH (default: ./audit.jsonl)
 */

import fs from "fs";
import path from "path";
import { AUDIT_LOG_PATH } from "./constants";

type AuditType = "command" | "execution" | "panic" | "error";

interface AuditEntry {
  ts: string;
  type: AuditType;
  session_id: string;
  payload: unknown;
  result?: unknown;
}

function appendEntry(entry: AuditEntry): void {
  const line = JSON.stringify(entry) + "\n";
  const resolved = path.resolve(AUDIT_LOG_PATH);
  try {
    fs.appendFileSync(resolved, line, "utf8");
  } catch (err) {
    // audit must not crash the app
    console.error("[audit] failed to write:", err);
  }
}

export function logCommand(payload: unknown, session_id = "anon", result?: unknown): void {
  appendEntry({ ts: new Date().toISOString(), type: "command", session_id, payload, result });
}

export function logExecution(payload: unknown, session_id = "anon", result?: unknown): void {
  appendEntry({ ts: new Date().toISOString(), type: "execution", session_id, payload, result });
}

export function logPanic(payload: unknown, session_id = "anon", result?: unknown): void {
  appendEntry({ ts: new Date().toISOString(), type: "panic", session_id, payload, result });
}

export function logError(payload: unknown, session_id = "anon"): void {
  appendEntry({ ts: new Date().toISOString(), type: "error", session_id, payload });
}

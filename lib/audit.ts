/**
 * Append-only JSONL audit logger — owned by Dev A.
 * Stub used by Dev C's parse route.
 */

import fs from "fs";
import path from "path";

const AUDIT_PATH = process.env.AUDIT_LOG_PATH ?? "./audit.jsonl";

interface AuditEntry {
  ts: string;
  type: string;
  [key: string]: unknown;
}

function appendEntry(entry: AuditEntry): void {
  try {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(path.resolve(AUDIT_PATH), line, "utf-8");
  } catch {
    // Non-fatal: don't let audit failures break the request
    console.error("[audit] Failed to write entry:", entry.type);
  }
}

export function logCommand(entry: {
  type: string;
  source: "chat" | "voice";
  raw_text: string;
  parsed: unknown;
}): void {
  appendEntry({ ts: new Date().toISOString(), ...entry });
}

export function logExecution(entry: {
  type: string;
  session_id?: string;
  payload: unknown;
  result: unknown;
}): void {
  appendEntry({ ts: new Date().toISOString(), ...entry });
}

export function logPanic(entry: {
  session_id?: string;
  payload: unknown;
  result: unknown;
}): void {
  appendEntry({ ts: new Date().toISOString(), type: "panic", ...entry });
}

"use client";

import { MAX_ORDER_USD } from "@/lib/constants";

interface HeaderProps {
  lastSyncAt: string | null;
}

export default function Header({ lastSyncAt }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 shrink-0"
      style={{ height: "56px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-black tracking-[0.12em] uppercase" style={{ color: "var(--blue-bright)" }}>
          Pulse
        </span>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: "var(--blue-dim)", border: "1px solid rgba(61,127,255,0.25)", color: "var(--blue-bright)" }}
        >
          <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--blue-bright)" }} />
          Live
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Max Order</span>
          <span className="text-[13px] font-semibold font-mono" style={{ color: "var(--text)" }}>${MAX_ORDER_USD}</span>
        </div>
        {lastSyncAt && (
          <div className="flex flex-col items-end gap-0.5 pl-5" style={{ borderLeft: "1px solid var(--border)" }}>
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Synced</span>
            <span className="text-[13px] font-semibold font-mono" style={{ color: "var(--text)" }}>{lastSyncAt}</span>
          </div>
        )}
      </div>
    </header>
  );
}

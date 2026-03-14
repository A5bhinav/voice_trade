"use client";

import { MAX_ORDER_USD } from "@/lib/constants";

interface HeaderProps {
  lastSyncAt: string | null;
}

export default function Header({ lastSyncAt }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 z-20" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)" }}>
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--accent)" }}>VOICE TRADE</h1>
        <div className="flex items-center px-3 py-1 rounded-full" style={{ background: "rgba(74,144,217,0.08)", border: "1px solid rgba(74,144,217,0.2)" }}>
          <div className="w-2 h-2 rounded-full mr-2" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", animation: "pulse 2s ease-in-out infinite" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Live</span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-xs font-medium">
        <div className="flex flex-col items-end">
          <span className="uppercase text-[10px] tracking-wider" style={{ color: "var(--text-secondary)" }}>Max Order</span>
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>${MAX_ORDER_USD}</span>
        </div>
        {lastSyncAt && (
          <div className="flex flex-col items-end pl-6" style={{ borderLeft: "1px solid var(--card-border)" }}>
            <span className="uppercase text-[10px] tracking-wider" style={{ color: "var(--text-secondary)" }}>Synced</span>
            <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{lastSyncAt}</span>
          </div>
        )}
      </div>
    </header>
  );
}

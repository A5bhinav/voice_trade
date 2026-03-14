"use client";

import { MAX_ORDER_USD } from "@/lib/constants";

interface HeaderProps {
  lastSyncAt: string | null;
}

export default function Header({ lastSyncAt }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-tight text-white">Voice Trade</span>
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-600 text-white">
          LIVE TRADING
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span>Max order: <span className="text-white font-medium">${MAX_ORDER_USD}</span></span>
        {lastSyncAt && (
          <span>Synced: <span className="text-white">{lastSyncAt}</span></span>
        )}
      </div>
    </header>
  );
}

"use client";

import { MAX_ORDER_USD } from "@/lib/constants";

interface HeaderProps {
  lastSyncAt: string | null;
}

export default function Header({ lastSyncAt }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black tracking-tight text-black">VOICE TRADE</h1>
        <div className="flex items-center px-3 py-1 rounded-full bg-zinc-100">
          <div className="w-2 h-2 rounded-full bg-black animate-pulse mr-2" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-black">Live</span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-xs font-medium text-zinc-400">
        <div className="flex flex-col items-end">
          <span className="uppercase text-[10px] tracking-wider text-zinc-300">Max Order</span>
          <span className="text-black text-sm">${MAX_ORDER_USD}</span>
        </div>
        {lastSyncAt && (
          <div className="flex flex-col items-end border-l border-zinc-100 pl-6">
            <span className="uppercase text-[10px] tracking-wider text-zinc-300">Synced</span>
            <span className="text-black text-sm">{lastSyncAt}</span>
          </div>
        )}
      </div>
    </header>
  );
}

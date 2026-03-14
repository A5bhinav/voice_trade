"use client";

import type { ExecutionReceipt } from "@/lib/types";

interface TradeReceiptProps {
  receipt: ExecutionReceipt;
}

const statusColors = {
  executed: "text-emerald-500",
  partial: "text-amber-500",
  failed: "text-red-500",
};

export default function TradeReceipt({ receipt }: TradeReceiptProps) {
  return (
    <div className="rounded-[24px] border border-zinc-100 bg-white p-5 shadow-sm max-w-sm mt-2 mb-2">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-50 pb-3">
        <span className="font-bold text-[14px] text-black capitalize">{receipt.type} Receipt</span>
        <span className={`text-[11px] font-black uppercase tracking-wider ${statusColors[receipt.status]}`}>
          {receipt.status}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">ID</span>
          <span className="font-mono text-[12px] font-semibold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded">{receipt.id.slice(0, 12)}…</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Time</span>
          <span className="text-[12px] font-semibold text-black">{new Date(receipt.timestamp).toLocaleTimeString()}</span>
        </div>
        {receipt.liquid_order_ids.length > 0 && (
          <div className="pt-2 border-t border-zinc-50 border-dashed">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Order IDs</span>
            <div className="flex flex-wrap gap-1">
              {receipt.liquid_order_ids.map((id) => (
                <span key={id} className="font-mono text-[11px] font-semibold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">{id}</span>
              ))}
            </div>
          </div>
        )}
        {receipt.error && (
          <div className="mt-3 text-red-500 text-[12px] font-bold bg-red-50 p-2 rounded-lg text-center">Error: {receipt.error}</div>
        )}
      </div>
    </div>
  );
}

"use client";

import type { ExecutionReceipt } from "@/lib/types";

interface TradeReceiptProps {
  receipt: ExecutionReceipt;
}

const statusColors = {
  executed: "text-green-400",
  partial: "text-yellow-400",
  failed: "text-red-400",
};

export default function TradeReceipt({ receipt }: TradeReceiptProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white capitalize">{receipt.type} Receipt</span>
        <span className={`font-medium capitalize ${statusColors[receipt.status]}`}>
          {receipt.status}
        </span>
      </div>
      <div className="space-y-1 text-zinc-400">
        <div className="flex justify-between">
          <span>ID</span>
          <span className="font-mono text-xs text-zinc-300">{receipt.id.slice(0, 12)}…</span>
        </div>
        <div className="flex justify-between">
          <span>Time</span>
          <span className="text-zinc-300">{new Date(receipt.timestamp).toLocaleTimeString()}</span>
        </div>
        {receipt.liquid_order_ids.length > 0 && (
          <div>
            <span className="block mb-1">Order IDs</span>
            {receipt.liquid_order_ids.map((id) => (
              <div key={id} className="font-mono text-xs text-zinc-300 ml-2">{id}</div>
            ))}
          </div>
        )}
        {receipt.error && (
          <div className="mt-2 text-red-400 text-xs">Error: {receipt.error}</div>
        )}
      </div>
    </div>
  );
}

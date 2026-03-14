"use client";

import type { ExecutionReceipt } from "@/lib/types";

interface TradeReceiptProps {
  receipt: ExecutionReceipt;
}

export default function TradeReceipt({ receipt }: TradeReceiptProps) {
  const statusStyle =
    receipt.status === "executed"
      ? { color: "var(--accent-green)" }
      : receipt.status === "partial"
      ? { color: "#ffb347" }
      : { color: "#ff6b6b" };

  return (
    <div className="rounded-2xl p-5 mt-2 mb-2 max-w-sm" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <span className="font-bold text-[14px] capitalize" style={{ color: "var(--foreground)" }}>
          {receipt.type} Receipt
        </span>
        <span className="text-[11px] font-black uppercase tracking-wider" style={statusStyle}>
          {receipt.status}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>ID</span>
          <span className="font-mono text-[12px] font-semibold px-2 py-0.5 rounded" style={{ color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)" }}>
            {receipt.id.slice(0, 12)}…
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Time</span>
          <span className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
            {new Date(receipt.timestamp).toLocaleTimeString()}
          </span>
        </div>
        {receipt.liquid_order_ids.length > 0 && (
          <div className="pt-2" style={{ borderTop: "1px dashed var(--card-border)" }}>
            <span className="text-[11px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--text-secondary)" }}>
              Order IDs
            </span>
            <div className="flex flex-wrap gap-1">
              {receipt.liquid_order_ids.map((id) => (
                <span
                  key={id}
                  className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)" }}
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
        {receipt.error && (
          <div className="mt-3 text-[12px] font-bold p-2 rounded-lg text-center" style={{ color: "#ff6b6b", background: "rgba(255,68,68,0.08)" }}>
            Error: {receipt.error}
          </div>
        )}
      </div>
    </div>
  );
}

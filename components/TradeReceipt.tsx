"use client";

import type { ExecutionReceipt } from "@/lib/types";

interface TradeReceiptProps {
  receipt: ExecutionReceipt;
}

export default function TradeReceipt({ receipt }: TradeReceiptProps) {
  const statusColor =
    receipt.status === "executed" ? "var(--green)" :
    receipt.status === "partial"  ? "var(--amber)" : "var(--red)";
  const statusBg =
    receipt.status === "executed" ? "var(--green-dim)" :
    receipt.status === "partial"  ? "var(--amber-dim)" : "var(--red-dim)";

  return (
    <div className="rounded-xl overflow-hidden w-full max-w-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-[13px] font-semibold capitalize" style={{ color: "var(--text)" }}>{receipt.type} Receipt</span>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: statusBg, color: statusColor }}>
          {receipt.status}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <Row label="ID">
          <span className="font-mono text-[11px]" style={{ color: "var(--text-2)" }}>{receipt.id.slice(0, 14)}&hellip;</span>
        </Row>
        <Row label="Time">
          <span className="font-mono text-[12px]" style={{ color: "var(--text)" }}>{new Date(receipt.timestamp).toLocaleTimeString()}</span>
        </Row>
        {receipt.liquid_order_ids.length > 0 && (
          <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Order IDs</div>
            <div className="flex flex-wrap gap-1">
              {receipt.liquid_order_ids.map((id) => (
                <span key={id} className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
        {receipt.error && (
          <div className="rounded-lg px-3 py-2 text-[11px] font-medium"
            style={{ background: "var(--red-dim)", color: "var(--red)" }}>
            {receipt.error}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{label}</span>
      {children}
    </div>
  );
}

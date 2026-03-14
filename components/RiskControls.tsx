"use client";

import { MAX_ORDER_USD, MAX_LEVERAGE, DAILY_LOSS_LIMIT_USD } from "@/lib/constants";

export default function RiskControls() {
  const rows = [
    { label: "Max order size", value: `$${MAX_ORDER_USD}` },
    { label: "Max leverage",   value: `${MAX_LEVERAGE}x` },
    { label: "Daily loss cap", value: `$${DAILY_LOSS_LIMIT_USD}` },
  ];

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-3)" }}>Risk Profile</h3>
      <div className="space-y-0">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <span className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>{r.label}</span>
            <span className="text-[13px] font-semibold font-mono" style={{ color: "var(--text)" }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

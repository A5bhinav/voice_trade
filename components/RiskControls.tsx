"use client";

import { MAX_ORDER_USD, MAX_LEVERAGE, DAILY_LOSS_LIMIT_USD } from "@/lib/constants";

export default function RiskControls() {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <h3 className="text-[11px] font-black uppercase tracking-widest mb-5" style={{ color: "var(--accent)" }}>
        Risk Profile
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Max order size</span>
          <span className="text-[14px] font-black" style={{ color: "var(--foreground)" }}>${MAX_ORDER_USD}</span>
        </div>
        <div className="flex justify-between items-center pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Max leverage</span>
          <span className="text-[14px] font-black" style={{ color: "var(--foreground)" }}>{MAX_LEVERAGE}x</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Daily loss cap</span>
          <span className="text-[14px] font-black" style={{ color: "var(--foreground)" }}>${DAILY_LOSS_LIMIT_USD}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { MAX_ORDER_USD, MAX_LEVERAGE, DAILY_LOSS_LIMIT_USD } from "@/lib/constants";

export default function RiskControls() {
  return (
    <div className="rounded-[24px] border border-zinc-100 bg-white p-6 shadow-sm">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-5">
        Risk Profile
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
          <span className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide">Max order size</span>
          <span className="text-[15px] text-black font-black">${MAX_ORDER_USD}</span>
        </div>
        <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
          <span className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide">Max leverage</span>
          <span className="text-[15px] text-black font-black">{MAX_LEVERAGE}x</span>
        </div>
        <div className="flex justify-between items-center pb-1">
          <span className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide">Daily loss cap</span>
          <span className="text-[15px] text-black font-black">${DAILY_LOSS_LIMIT_USD}</span>
        </div>
      </div>
    </div>
  );
}

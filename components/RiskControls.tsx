"use client";

import { MAX_ORDER_USD, MAX_LEVERAGE, DAILY_LOSS_LIMIT_USD } from "@/lib/constants";

export default function RiskControls() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
        Risk Controls
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400">Max order size</span>
          <span className="text-white font-medium">${MAX_ORDER_USD}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Max leverage</span>
          <span className="text-white font-medium">{MAX_LEVERAGE}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Daily loss cap</span>
          <span className="text-white font-medium">${DAILY_LOSS_LIMIT_USD}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Hackathon prototype — real money at risk.
      </p>
    </div>
  );
}

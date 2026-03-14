"use client";

import type { PortfolioSnapshot } from "@/lib/types";

interface PortfolioPanelProps {
  portfolio: PortfolioSnapshot | null;
  loading: boolean;
}

export default function PortfolioPanel({ portfolio, loading }: PortfolioPanelProps) {
  if (loading && !portfolio) {
    return (
      <div className="rounded-[24px] border border-zinc-100 bg-white p-6 shadow-sm">
        <div className="text-zinc-400 text-sm font-medium">Loading portfolio…</div>
      </div>
    );
  }

  if (!portfolio) return null;

  const { account, positions, open_orders } = portfolio;

  return (
    <div className="rounded-[24px] border border-zinc-100 bg-white p-6 shadow-sm space-y-6">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Portfolio</h3>

      <div className="flex gap-8 border-b border-zinc-100 pb-6">
        <div>
          <div className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Balance</div>
          <div className="text-2xl font-black text-black tracking-tight">${account.balance_usd.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Available</div>
          <div className="text-2xl font-black text-black tracking-tight">${account.available_usd.toFixed(2)}</div>
        </div>
      </div>

      {positions.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Positions</div>
          <div className="space-y-2">
            {positions.map((p) => (
              <div key={p.symbol} className="flex items-center justify-between bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.side === "long" ? "bg-black text-white" : "bg-zinc-200 text-black"}`}>
                    {p.side}
                  </span>
                  <span className="text-[14px] font-bold text-black">{p.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold text-black">{p.size}</div>
                  <div className={`text-[12px] font-semibold ${p.unrealized_pnl >= 0 ? "text-emerald-500" : "text-zinc-400"}`}>
                    {p.unrealized_pnl >= 0 ? "+" : ""}{p.unrealized_pnl.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open_orders.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Open Orders ({open_orders.length})</div>
          <div className="space-y-2">
            {open_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-xs bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${o.side === "buy" ? "bg-black text-white" : "bg-zinc-200 text-black"}`}>
                    {o.side}
                  </span>
                  <span className="text-[14px] font-bold text-black">{o.symbol}</span>
                </div>
                <div className="flex items-center gap-4 text-[13px] font-semibold">
                  <span className="text-black">${o.size_usd}</span>
                  <span className="text-zinc-400 capitalize">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {positions.length === 0 && open_orders.length === 0 && (
        <div className="text-[13px] font-medium text-zinc-400 py-2">No open positions or orders.</div>
      )}
    </div>
  );
}

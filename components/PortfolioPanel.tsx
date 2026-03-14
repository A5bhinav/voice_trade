"use client";

import type { PortfolioSnapshot } from "@/lib/types";

interface PortfolioPanelProps {
  portfolio: PortfolioSnapshot | null;
  loading: boolean;
}

export default function PortfolioPanel({ portfolio, loading }: PortfolioPanelProps) {
  if (loading && !portfolio) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="text-zinc-500 text-sm">Loading portfolio…</div>
      </div>
    );
  }

  if (!portfolio) return null;

  const { account, positions, open_orders } = portfolio;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Portfolio</h3>

      <div className="flex gap-6 text-sm">
        <div>
          <div className="text-zinc-500">Balance</div>
          <div className="text-white font-semibold">${account.balance_usd.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-500">Available</div>
          <div className="text-white font-semibold">${account.available_usd.toFixed(2)}</div>
        </div>
      </div>

      {positions.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase mb-2">Positions</div>
          <div className="space-y-1">
            {positions.map((p) => (
              <div key={p.symbol} className="flex items-center justify-between text-sm bg-zinc-800 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase ${p.side === "long" ? "text-green-400" : "text-red-400"}`}>
                    {p.side}
                  </span>
                  <span className="text-zinc-200">{p.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-zinc-200">{p.size}</div>
                  <div className={`text-xs ${p.unrealized_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {p.unrealized_pnl >= 0 ? "+" : ""}{p.unrealized_pnl.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open_orders.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase mb-2">Open Orders ({open_orders.length})</div>
          <div className="space-y-1">
            {open_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-xs bg-zinc-800 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold uppercase ${o.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                    {o.side}
                  </span>
                  <span className="text-zinc-200">{o.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-300">${o.size_usd}</span>
                  <span className="text-zinc-500">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {positions.length === 0 && open_orders.length === 0 && (
        <div className="text-sm text-zinc-500">No open positions or orders.</div>
      )}
    </div>
  );
}

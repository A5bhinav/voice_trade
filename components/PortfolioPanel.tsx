"use client";

import type { PortfolioSnapshot } from "@/lib/types";

interface PortfolioPanelProps {
  portfolio: PortfolioSnapshot | null;
  loading: boolean;
}

export default function PortfolioPanel({ portfolio, loading }: PortfolioPanelProps) {
  if (loading && !portfolio) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Loading portfolio…</div>
      </div>
    );
  }

  if (!portfolio) return null;

  const { account, positions, open_orders } = portfolio;

  return (
    <div className="rounded-2xl p-5 space-y-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--accent-green)" }}>
        Portfolio Tracker
      </h3>

      <div className="flex gap-6 pb-4" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            Balance
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            ${account.balance_usd.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            Available
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            ${account.available_usd.toFixed(2)}
          </div>
        </div>
      </div>

      {positions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Positions
          </div>
          <div className="space-y-2">
            {positions.map((p) => (
              <div
                key={p.symbol}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={
                      p.side === "long"
                        ? { background: "rgba(61,255,124,0.15)", color: "var(--accent-green)", border: "1px solid rgba(61,255,124,0.3)" }
                        : { background: "rgba(255,68,68,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,68,68,0.3)" }
                    }
                  >
                    {p.side}
                  </span>
                  <span className="text-[14px] font-bold" style={{ color: "var(--foreground)" }}>{p.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold" style={{ color: "var(--foreground)" }}>{p.size}</div>
                  <div className="text-[12px] font-semibold" style={{ color: p.unrealized_pnl >= 0 ? "var(--accent-green)" : "#ff6b6b" }}>
                    {p.unrealized_pnl >= 0 ? "+" : ""}{p.unrealized_pnl.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open_orders.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Open Orders ({open_orders.length})
          </div>
          <div className="space-y-2">
            {open_orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={
                      o.side === "buy"
                        ? { background: "rgba(61,255,124,0.15)", color: "var(--accent-green)", border: "1px solid rgba(61,255,124,0.3)" }
                        : { background: "rgba(255,68,68,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,68,68,0.3)" }
                    }
                  >
                    {o.side}
                  </span>
                  <span className="text-[14px] font-bold" style={{ color: "var(--foreground)" }}>{o.symbol}</span>
                </div>
                <div className="flex items-center gap-3 text-[13px] font-semibold">
                  <span style={{ color: "var(--foreground)" }}>${o.size_usd}</span>
                  <span className="capitalize" style={{ color: "var(--text-secondary)" }}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {positions.length === 0 && open_orders.length === 0 && (
        <div className="text-[13px] font-medium py-1" style={{ color: "var(--text-secondary)" }}>
          No open positions or orders.
        </div>
      )}
    </div>
  );
}

"use client";

import type { PortfolioSnapshot } from "@/lib/types";

interface PortfolioPanelProps {
  portfolio: PortfolioSnapshot | null;
  loading: boolean;
}

export default function PortfolioPanel({ portfolio, loading }: PortfolioPanelProps) {
  if (loading && !portfolio) {
    return (
      <Card label="Portfolio">
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading&hellip;</div>
      </Card>
    );
  }
  if (!portfolio) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOffline = (portfolio as any).offline === true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offlineReason: string = (portfolio as any).offlineReason ?? "";

  if (isOffline) {
    return (
      <Card label="Portfolio">
        <div className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "var(--red-dim)", border: "1px solid rgba(240,69,69,0.25)" }}>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--red)" }}>
            Exchange Offline
          </div>
          <div className="text-[11px] font-medium leading-snug" style={{ color: "var(--text-2)" }}>
            {offlineReason.includes("EXPIRED_TIMESTAMP") || offlineReason.includes("401")
              ? "API keys are expired or invalid. Generate new keys in your exchange account."
              : offlineReason || "Cannot reach exchange. Check your API keys and connection."}
          </div>
        </div>
      </Card>
    );
  }

  const { account, positions, open_orders } = portfolio;

  return (
    <Card label="Portfolio">
      {/* Balance row */}
      <div className="flex gap-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Balance</div>
          <div className="text-[18px] font-bold font-mono" style={{ color: "var(--text)" }}>
            ${account.balance_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Available</div>
          <div className="text-[18px] font-bold font-mono" style={{ color: "var(--text)" }}>
            ${account.available_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Positions */}
      {positions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest pb-1" style={{ color: "var(--text-3)" }}>Positions</div>
          {positions.map((p) => (
            <div key={p.symbol} className="flex items-center justify-between rounded-lg px-3 py-2.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <SideBadge side={p.side} />
                <span className="text-[12px] font-semibold font-mono" style={{ color: "var(--text)" }}>{p.symbol}</span>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-semibold font-mono" style={{ color: "var(--text)" }}>{p.size}</div>
                <div className="text-[11px] font-mono" style={{ color: p.unrealized_pnl >= 0 ? "var(--green)" : "var(--red)" }}>
                  {p.unrealized_pnl >= 0 ? "+" : ""}{p.unrealized_pnl.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Open orders */}
      {open_orders.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest pb-1" style={{ color: "var(--text-3)" }}>
            Open Orders <span style={{ color: "var(--text-3)" }}>({open_orders.length})</span>
          </div>
          {open_orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg px-3 py-2.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <SideBadge side={o.side} />
                <span className="text-[12px] font-semibold font-mono" style={{ color: "var(--text)" }}>{o.symbol}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-mono" style={{ color: "var(--text)" }}>${o.size_usd}</span>
                <span className="text-[10px] font-medium capitalize" style={{ color: "var(--text-3)" }}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {positions.length === 0 && open_orders.length === 0 && (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No open positions or orders.</p>
      )}
    </Card>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-3)" }}>{label}</h3>
      {children}
    </div>
  );
}

function SideBadge({ side }: { side: string }) {
  const isBuy = side === "buy" || side === "long";
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{
        background: isBuy ? "var(--green-dim)" : "var(--red-dim)",
        color: isBuy ? "var(--green)" : "var(--red)",
        border: `1px solid ${isBuy ? "rgba(32,201,122,0.25)" : "rgba(240,69,69,0.25)"}`,
      }}
    >
      {side}
    </span>
  );
}

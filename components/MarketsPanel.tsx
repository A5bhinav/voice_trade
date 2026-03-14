"use client";

import { useState, useEffect } from "react";

interface MarketTicker {
  symbol: string;
  price: number | null;
  offline?: boolean;
}

export default function MarketsPanel() {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) return;
        setTickers(await res.json());
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetchMarkets();
    const id = setInterval(fetchMarkets, 10_000);
    return () => clearInterval(id);
  }, []);

  if (loading && tickers.length === 0) {
    return <SectionCard label="Live Markets"><div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading&hellip;</div></SectionCard>;
  }
  if (tickers.length === 0) return null;

  const isOffline = tickers.every(t => t.offline);

  return (
    <SectionCard label={isOffline ? "Markets — Offline" : "Live Markets"}>
      {isOffline ? (
        <div className="text-[11px] font-medium" style={{ color: "var(--red)" }}>
          Exchange unreachable. Check API keys.
        </div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tickers.length}, 1fr)` }}>
          {tickers.map((t) => (
            <div key={t.symbol} className="flex flex-col items-center gap-1 rounded-lg py-3"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                {t.symbol.replace("-PERP", "")}
              </span>
              <span className="text-[13px] font-semibold font-mono" style={{ color: "var(--text)" }}>
                {t.price !== null ? `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}` : "---"}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-3)" }}>{label}</h3>
      {children}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface MarketTicker {
  symbol: string;
  price: number | null;
}

export default function MarketsPanel() {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) return;
        const data = await res.json();
        setTickers(data);
      } catch (err) {
        console.error("Failed to fetch markets", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && tickers.length === 0) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Loading markets…</div>
      </div>
    );
  }

  if (tickers.length === 0) return null;

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--accent-green)" }}>
        Live Markets
      </h3>
      <div className="flex justify-between items-center gap-2">
        {tickers.map((t) => (
          <div
            key={t.symbol}
            className="flex-1 text-center rounded-xl py-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <div className="text-[11px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
              {t.symbol.replace("-PERP", "")}
            </div>
            <div className="text-[14px] font-black" style={{ color: "var(--foreground)" }}>
              {t.price !== null ? `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}` : "---"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

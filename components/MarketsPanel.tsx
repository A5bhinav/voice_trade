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
      <div className="rounded-[24px] border border-zinc-100 bg-white p-6 shadow-sm">
        <div className="text-zinc-400 text-sm font-medium">Loading markets…</div>
      </div>
    );
  }

  if (tickers.length === 0) return null;

  return (
    <div className="rounded-[24px] border border-zinc-100 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Live Markets</h3>
      <div className="flex justify-between items-center gap-2">
        {tickers.map((t) => (
          <div key={t.symbol} className="flex-1 text-center bg-zinc-50 rounded-2xl py-3 border border-zinc-100">
            <div className="text-[11px] font-bold text-zinc-400 mb-1">{t.symbol.replace("-PERP", "")}</div>
            <div className="text-[14px] font-black text-black">
              {t.price !== null ? `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}` : "---"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

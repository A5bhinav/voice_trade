"use client";

import { useState, useEffect, useCallback } from "react";
import type { PortfolioSnapshot } from "@/lib/types";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import PortfolioPanel from "@/components/PortfolioPanel";
import PanicButton from "@/components/PanicButton";
import RiskControls from "@/components/RiskControls";
import MarketsPanel from "@/components/MarketsPanel";

export default function Home() {
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [panicArmed, setPanicArmed] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) return;
      const data = await res.json();
      setPortfolio(data);
      setLastSyncAt(new Date().toLocaleTimeString());
    } catch {
      // silent — will retry
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 10_000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Header lastSyncAt={lastSyncAt} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: chat + voice input */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ borderRight: "1px solid var(--border)" }}>
          <ChatPanel />
        </div>

        {/* Right: data sidebar */}
        <div
          className="w-80 flex flex-col gap-3 p-4 overflow-y-auto shrink-0"
          style={{ background: "var(--bg)" }}
        >
          <MarketsPanel />
          <PortfolioPanel portfolio={portfolio} loading={portfolioLoading} />
          <RiskControls />
          <PanicButton
            armed={panicArmed}
            onArmToggle={() => setPanicArmed((a) => !a)}
            onPanicComplete={fetchPortfolio}
          />
        </div>
      </div>
    </div>
  );
}

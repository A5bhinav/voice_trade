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
    <div className="flex flex-col h-screen font-sans items-center" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="w-full max-w-4xl flex flex-col h-full overflow-hidden relative" style={{ background: "var(--background)" }}>
        <Header lastSyncAt={lastSyncAt} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left column: chat + voice */}
          <div className="flex flex-col flex-1 z-10" style={{ borderRight: "1px solid var(--card-border)", background: "var(--background)" }}>
            <ChatPanel />
          </div>

          {/* Right column: context (portfolio, markets, actions) */}
          <div className="w-[340px] flex flex-col gap-4 p-4 overflow-y-auto" style={{ background: "var(--background)" }}>
            <MarketsPanel />
            <PortfolioPanel portfolio={portfolio} loading={portfolioLoading} />
            <RiskControls />
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
               <PanicButton
                 armed={panicArmed}
                 onArmToggle={() => setPanicArmed((a) => !a)}
                 onPanicComplete={fetchPortfolio}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

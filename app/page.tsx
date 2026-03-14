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
    <div className="flex flex-col h-screen bg-white text-black font-sans items-center">
      <div className="w-full max-w-4xl flex flex-col h-full bg-white shadow-sm ring-1 ring-zinc-100 overflow-hidden relative">
        <Header lastSyncAt={lastSyncAt} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left column: chat + voice (mobile proportions) */}
          <div className="flex flex-col flex-1 border-r border-zinc-100 bg-white z-10">
            <ChatPanel />
          </div>

          {/* Right column: context (portfolio, markets, actions) */}
          <div className="w-[340px] flex flex-col gap-6 p-6 overflow-y-auto bg-zinc-50/50">
            <MarketsPanel />
            <PortfolioPanel portfolio={portfolio} loading={portfolioLoading} />
            <RiskControls />
            <div className="mt-8 pt-6 border-t border-zinc-200">
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

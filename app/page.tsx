"use client";

import { useState, useEffect, useCallback } from "react";
import type { PortfolioSnapshot } from "@/lib/types";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import PortfolioPanel from "@/components/PortfolioPanel";
import PanicButton from "@/components/PanicButton";
import RiskControls from "@/components/RiskControls";

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
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Header lastSyncAt={lastSyncAt} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left column: chat + voice */}
        <div className="flex flex-col flex-1 border-r border-zinc-800 overflow-hidden">
          <ChatPanel />
        </div>

        {/* Right column: portfolio + panic + risk */}
        <div className="w-80 flex flex-col gap-4 p-4 overflow-y-auto bg-zinc-950">
          <PortfolioPanel portfolio={portfolio} loading={portfolioLoading} />
          <PanicButton
            armed={panicArmed}
            onArmToggle={() => setPanicArmed((a) => !a)}
            onPanicComplete={fetchPortfolio}
          />
          <RiskControls />
        </div>
      </div>
    </div>
  );
}

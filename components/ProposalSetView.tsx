"use client";

import type { ProposalSet, TradeCommand } from "@/lib/types";

interface Props {
  proposalSet: ProposalSet;
  onSelect: (command: TradeCommand) => void;
  onCancel: () => void;
  loading?: boolean;
}

function commandLabel(cmd: TradeCommand): string {
  if (cmd.action === "panic") return "Close all positions";
  const side = cmd.side?.toUpperCase() ?? "";
  const size = cmd.size_usd ? `$${cmd.size_usd}` : "";
  const symbol = cmd.symbol ?? "";
  const lev = cmd.leverage && cmd.leverage > 1 ? ` @ ${cmd.leverage}x` : "";
  return `${side} ${size} ${symbol}${lev}`.trim();
}

export default function ProposalSetView({ proposalSet, onSelect, onCancel, loading }: Props) {
  return (
    <div className="rounded-xl overflow-hidden w-full max-w-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--blue-bright)" }}>
          Intent Detected
        </span>
        <p className="mt-1 text-[13px] font-semibold leading-snug" style={{ color: "var(--text)" }}>
          {proposalSet.user_intent}
        </p>
      </div>

      {/* Proposals */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
          Matching trades
        </p>
        {proposalSet.proposals.map((p, i) => (
          <div key={i} className="rounded-lg p-3 space-y-2"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[13px]" style={{ color: "var(--text)" }}>
                {commandLabel(p.command)}
              </span>
              {i === 0 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider shrink-0"
                  style={{ background: "var(--blue-dim)", color: "var(--blue-bright)", border: "1px solid rgba(61,127,255,0.25)" }}>
                  Best fit
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              {p.rationale}
            </p>
            <button
              onClick={() => onSelect(p.command)}
              disabled={loading}
              className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--blue)", color: "#fff", boxShadow: "0 2px 8px rgba(61,127,255,0.3)" }}
            >
              {loading ? "Loading\u2026" : "Preview trade"}
            </button>
          </div>
        ))}
      </div>

      {/* Dismiss */}
      <div className="px-4 pb-4">
        <button onClick={onCancel} disabled={loading}
          className="w-full py-2 rounded-lg text-[12px] font-semibold disabled:opacity-40"
          style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

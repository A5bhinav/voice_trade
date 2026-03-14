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
    <div
      className="rounded-2xl p-5 mt-2 mb-2 space-y-4 max-w-sm"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {/* Intent header */}
      <div>
        <span
          className="px-2 py-0.5 text-[10px] rounded-full uppercase font-bold tracking-wider mr-2"
          style={{ background: "rgba(61,255,124,0.12)", color: "var(--accent)", border: "1px solid rgba(61,255,124,0.25)" }}
        >
          Intent detected
        </span>
        <p className="mt-2 text-[14px] font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
          {proposalSet.user_intent}
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--card-border)" }} />

      {/* Proposals */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Matching trades
        </p>
        {proposalSet.proposals.map((p, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[13px]" style={{ color: "var(--foreground)" }}>
                {commandLabel(p.command)}
              </span>
              {i === 0 && (
                <span
                  className="px-1.5 py-0.5 text-[9px] rounded-full uppercase font-bold tracking-wider shrink-0"
                  style={{ background: "rgba(61,255,124,0.12)", color: "var(--accent)", border: "1px solid rgba(61,255,124,0.25)" }}
                >
                  Best fit
                </span>
              )}
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {p.rationale}
            </p>
            <button
              onClick={() => onSelect(p.command)}
              disabled={loading}
              className="w-full py-2 rounded-full text-[12px] font-bold transition-colors disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#05080f" }}
            >
              {loading ? "Loading…" : "Preview trade"}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onCancel}
        disabled={loading}
        className="w-full py-2 rounded-full text-[12px] font-bold"
        style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", border: "1px solid var(--card-border)" }}
      >
        Dismiss
      </button>
    </div>
  );
}

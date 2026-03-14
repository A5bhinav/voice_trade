"use client";

import { useState } from "react";
import type { PanicPreview, ExecutionReceipt } from "@/lib/types";

interface PanicButtonProps {
  armed: boolean;
  onArmToggle: () => void;
  onPanicComplete: () => void;
}

interface PanicResult {
  orders_cancelled: number;
  positions_closed: string[];
  failures: string[];
}

export default function PanicButton({ armed, onArmToggle, onPanicComplete }: PanicButtonProps) {
  const [preview, setPreview] = useState<PanicPreview | null>(null);
  const [result, setResult] = useState<PanicResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePanicClick() {
    if (!armed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/panic/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ armed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch panic preview");
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPanic() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/panic/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_token: preview.confirmation_token, armed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Panic execution failed");
      setResult(data);
      setPreview(null);
      onPanicComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,40,40,0.05)", border: "1px solid rgba(255,68,68,0.2)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#ff6b6b" }}>Panic System</span>
        <button
          onClick={onArmToggle}
          className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors"
          style={
            armed
              ? { background: "rgba(255,68,68,0.2)", color: "#ff6b6b", border: "1px solid rgba(255,68,68,0.4)" }
              : { background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--card-border)" }
          }
        >
          {armed ? "Armed" : "Disarmed"}
        </button>
      </div>

      <button
        onClick={handlePanicClick}
        disabled={!armed || loading}
        className="w-full py-4 rounded-full font-black text-[13px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: "rgba(255,68,68,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,68,68,0.3)" }}
      >
        {loading ? "Loading…" : "PANIC — Close All"}
      </button>

      {!armed && (
        <p className="text-[12px] font-medium text-center" style={{ color: "rgba(255,107,107,0.6)" }}>
          Arm system to enable emergency close
        </p>
      )}

      {error && (
        <div className="text-[13px] font-medium p-3 rounded-xl" style={{ color: "#ff6b6b", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {preview && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card-bg)", border: "1px solid rgba(255,68,68,0.3)" }}>
          <div className="font-bold text-[14px]" style={{ color: "#ff6b6b" }}>Confirm Panic Execution</div>
          <div className="text-[13px] space-y-1" style={{ color: "var(--text-secondary)" }}>
            <div>Open orders to cancel: <span className="font-bold" style={{ color: "var(--foreground)" }}>{preview.open_orders_count}</span></div>
            <div>Positions to close: <span className="font-bold" style={{ color: "var(--foreground)" }}>{preview.open_positions.length}</span></div>
            {preview.open_positions.map((p) => (
              <div key={p.symbol} className="ml-3 text-[12px] font-semibold">{p.symbol}: {p.size}</div>
            ))}
            <div className="pt-1">Est. API mutations: <span className="font-bold" style={{ color: "var(--foreground)" }}>{preview.estimated_mutations}</span></div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-full text-[13px] font-bold transition-colors disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", border: "1px solid var(--card-border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPanic}
              disabled={loading}
              className="flex-1 py-3 rounded-full text-[13px] font-bold tracking-wide transition-colors disabled:opacity-50"
              style={{ background: "rgba(255,68,68,0.2)", color: "#ff6b6b", border: "1px solid rgba(255,68,68,0.4)" }}
            >
              {loading ? "Executing…" : "CONFIRM PANIC"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(74,144,217,0.05)", border: "1px solid rgba(74,144,217,0.2)" }}>
          <div className="font-black tracking-tight text-[15px]" style={{ color: "var(--accent)" }}>Panic Complete</div>
          <div className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
            Orders cancelled: <span className="font-bold">{result.orders_cancelled}</span>
          </div>
          <div className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
            Positions closed: <span className="font-bold">{result.positions_closed.join(", ") || "none"}</span>
          </div>
          {result.failures.length > 0 && (
            <div className="text-[13px] font-semibold p-2 rounded-lg mt-2" style={{ color: "#ff6b6b", background: "rgba(255,68,68,0.08)" }}>
              Failures: {result.failures.join(", ")}
            </div>
          )}
          <button
            onClick={handleCancel}
            className="text-[12px] font-bold uppercase tracking-widest mt-3"
            style={{ color: "var(--accent)" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

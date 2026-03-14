"use client";

import { useState } from "react";
import type { PanicPreview } from "@/lib/types";

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
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/panic/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ armed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPreview(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  }

  async function handleConfirmPanic() {
    if (!preview) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/panic/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation_token: preview.confirmation_token, armed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Panic failed");
      setResult(data); setPreview(null); onPanicComplete();
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  }

  function handleCancel() { setPreview(null); setResult(null); setError(null); }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid rgba(240,69,69,0.2)" }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--red)" }}>Panic System</span>
        <button
          onClick={onArmToggle}
          className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded transition-all"
          style={armed
            ? { background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(240,69,69,0.35)" }
            : { background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }
          }
        >
          {armed ? "Armed" : "Disarmed"}
        </button>
      </div>

      {/* Panic trigger */}
      <button
        onClick={handlePanicClick}
        disabled={!armed || loading}
        className="w-full py-3 rounded-lg text-[12px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: armed ? "var(--red-dim)" : "var(--surface-2)", color: "var(--red)", border: "1px solid rgba(240,69,69,0.3)" }}
      >
        {loading ? "Loading\u2026" : "PANIC \u2014 Close All"}
      </button>

      {!armed && (
        <p className="text-[10px] text-center" style={{ color: "var(--text-3)" }}>Arm to enable emergency close</p>
      )}

      {error && (
        <div className="rounded-lg px-3 py-2 text-[11px] font-medium" style={{ background: "var(--red-dim)", color: "var(--red)" }}>{error}</div>
      )}

      {/* Confirmation preview */}
      {preview && (
        <div className="rounded-lg p-3 space-y-2.5" style={{ background: "var(--surface-2)", border: "1px solid rgba(240,69,69,0.3)" }}>
          <div className="text-[12px] font-bold" style={{ color: "var(--red)" }}>Confirm Panic</div>
          <div className="space-y-1 text-[11px]" style={{ color: "var(--text-2)" }}>
            <div>Orders to cancel: <span className="font-bold font-mono" style={{ color: "var(--text)" }}>{preview.open_orders_count}</span></div>
            <div>Positions to close: <span className="font-bold font-mono" style={{ color: "var(--text)" }}>{preview.open_positions.length}</span></div>
            {preview.open_positions.map((p) => (
              <div key={p.symbol} className="ml-3 font-mono text-[10px]">{p.symbol}: {p.size}</div>
            ))}
            <div>Est. mutations: <span className="font-bold font-mono" style={{ color: "var(--text)" }}>{preview.estimated_mutations}</span></div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCancel} disabled={loading}
              className="flex-1 py-2 rounded-lg text-[11px] font-semibold disabled:opacity-40"
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button onClick={handleConfirmPanic} disabled={loading}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold disabled:opacity-40"
              style={{ background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(240,69,69,0.35)" }}>
              {loading ? "Executing\u2026" : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--green-dim)", border: "1px solid rgba(32,201,122,0.25)" }}>
          <div className="text-[12px] font-bold" style={{ color: "var(--green)" }}>Panic Complete</div>
          <div className="text-[11px]" style={{ color: "var(--text-2)" }}>
            Cancelled: <span className="font-mono font-bold" style={{ color: "var(--text)" }}>{result.orders_cancelled}</span>
            {" \u00b7 "}
            Closed: <span className="font-mono font-bold" style={{ color: "var(--text)" }}>{result.positions_closed.join(", ") || "none"}</span>
          </div>
          {result.failures.length > 0 && (
            <div className="text-[11px]" style={{ color: "var(--red)" }}>Failures: {result.failures.join(", ")}</div>
          )}
          <button onClick={handleCancel} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--green)" }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

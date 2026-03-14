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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-300">Panic Mode</span>
        <button
          onClick={onArmToggle}
          className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
            armed
              ? "bg-red-700 text-white hover:bg-red-600"
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          }`}
        >
          {armed ? "ARMED" : "Disarmed"}
        </button>
      </div>

      <button
        onClick={handlePanicClick}
        disabled={!armed || loading}
        className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-widest transition-colors bg-red-700 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Loading…" : "PANIC — Close All"}
      </button>

      {!armed && (
        <p className="text-xs text-zinc-500 text-center">Arm panic mode to enable emergency close</p>
      )}

      {error && <div className="text-red-400 text-xs">{error}</div>}

      {preview && (
        <div className="border border-red-800 rounded bg-zinc-950 p-3 space-y-2 text-sm">
          <div className="text-red-400 font-semibold">Confirm Panic Execution</div>
          <div className="text-zinc-300">
            <div>Open orders to cancel: <span className="text-white font-medium">{preview.open_orders_count}</span></div>
            <div>Positions to close: <span className="text-white font-medium">{preview.open_positions.length}</span></div>
            {preview.open_positions.map((p) => (
              <div key={p.symbol} className="ml-3 text-xs text-zinc-400">
                {p.symbol}: {p.size}
              </div>
            ))}
            <div>Est. API mutations: <span className="text-white font-medium">{preview.estimated_mutations}</span></div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmPanic}
              disabled={loading}
              className="flex-1 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {loading ? "Executing…" : "CONFIRM PANIC"}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-2 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="border border-zinc-700 rounded bg-zinc-950 p-3 text-sm space-y-1">
          <div className="text-green-400 font-semibold">Panic Complete</div>
          <div className="text-zinc-300">Orders cancelled: {result.orders_cancelled}</div>
          <div className="text-zinc-300">Positions closed: {result.positions_closed.join(", ") || "none"}</div>
          {result.failures.length > 0 && (
            <div className="text-red-400 text-xs">Failures: {result.failures.join(", ")}</div>
          )}
          <button onClick={handleCancel} className="text-xs text-zinc-500 hover:text-zinc-300 mt-1">Dismiss</button>
        </div>
      )}
    </div>
  );
}

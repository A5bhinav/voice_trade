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
    <div className="rounded-[24px] border border-red-100 bg-red-50/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-red-600">Panic System</span>
        <button
          onClick={onArmToggle}
          className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors ${
            armed
              ? "bg-red-500 text-white shadow-red-500/20 shadow-sm"
              : "bg-white text-red-400 border border-red-200"
          }`}
        >
          {armed ? "Armed" : "Disarmed"}
        </button>
      </div>

      <button
        onClick={handlePanicClick}
        disabled={!armed || loading}
        className="w-full py-4 rounded-full font-black text-[13px] uppercase tracking-widest transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm border border-red-600"
      >
        {loading ? "Loading…" : "PANIC — Close All"}
      </button>

      {!armed && (
        <p className="text-[12px] font-medium text-red-400/80 text-center">Arm system to enable emergency close</p>
      )}

      {error && <div className="text-red-500 text-[13px] font-medium bg-red-50 p-3 rounded-xl">{error}</div>}

      {preview && (
        <div className="border border-red-200 rounded-2xl bg-white p-5 space-y-4 shadow-sm">
          <div className="text-red-600 font-bold text-[14px]">Confirm Panic Execution</div>
          <div className="text-zinc-600 text-[13px] space-y-1">
            <div>Open orders to cancel: <span className="text-black font-bold">{preview.open_orders_count}</span></div>
            <div>Positions to close: <span className="text-black font-bold">{preview.open_positions.length}</span></div>
            {preview.open_positions.map((p) => (
              <div key={p.symbol} className="ml-3 text-[12px] font-semibold text-zinc-500">
                {p.symbol}: {p.size}
              </div>
            ))}
            <div className="pt-2">Est. API mutations: <span className="text-black font-bold">{preview.estimated_mutations}</span></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirmPanic}
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-red-600 text-white text-[13px] font-bold tracking-wide hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Executing…" : "CONFIRM PANIC"}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-zinc-100 text-black text-[13px] font-bold tracking-wide hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="border border-green-200 rounded-2xl bg-green-50 p-5 space-y-2 shadow-sm">
          <div className="text-emerald-700 font-black tracking-tight text-[15px]">Panic Complete</div>
          <div className="text-emerald-800 text-[13px] font-medium">Orders cancelled: <span className="font-bold">{result.orders_cancelled}</span></div>
          <div className="text-emerald-800 text-[13px] font-medium">Positions closed: <span className="font-bold">{result.positions_closed.join(", ") || "none"}</span></div>
          {result.failures.length > 0 && (
            <div className="text-red-600 text-[13px] font-semibold bg-red-100 p-2 rounded-lg mt-2">Failures: {result.failures.join(", ")}</div>
          )}
          <button onClick={handleCancel} className="text-[12px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-widest mt-3">Dismiss</button>
        </div>
      )}
    </div>
  );
}

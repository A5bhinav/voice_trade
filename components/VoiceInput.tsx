"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<AnyRecognition>(null);
  const isHoldingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as AnyRecognition;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event: AnyRecognition) => {
        const result = Array.from(event.results as AnyRecognition[])
          .map((r: AnyRecognition) => r[0].transcript as string)
          .join(" ");
        setTranscript(result);
      };
      recognition.onend = () => {
        if (isHoldingRef.current) {
          try { recognition.start(); } catch { /* already starting */ }
        } else {
          setListening(false);
        }
      };
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Failed to initialize Speech Recognition", e);
      setSupported(false);
    }
  }, []);

  function startListening() {
    if (!recognitionRef.current || disabled) return;
    isHoldingRef.current = true;
    setTranscript("");
    setListening(true);
    try { recognitionRef.current.start(); } catch { /* already running */ }
  }

  function stopListening() {
    if (!recognitionRef.current) return;
    isHoldingRef.current = false;
    setListening(false);
    recognitionRef.current.stop();
  }

  function handleSubmitTranscript() {
    if (!transcript.trim()) return;
    onTranscript(transcript.trim());
    setTranscript("");
  }

  if (!supported) {
    return (
      <div className="text-[11px] text-center py-2 font-medium" style={{ color: "var(--text-3)" }}>
        Voice not supported — use Chrome for push-to-talk.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label */}
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
        Voice Command
      </span>

      {/* Mic orb */}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {/* Sonar rings — only when listening */}
        {listening && (
          <>
            <span className="sonar-ring" />
            <span className="sonar-ring" />
            <span className="sonar-ring" />
          </>
        )}

        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          disabled={disabled}
          className="relative z-10 flex items-center justify-center rounded-full transition-all duration-200 select-none disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            width: 72,
            height: 72,
            background: listening
              ? "radial-gradient(circle at 40% 35%, #ffffff 0%, #c8d8ff 45%, #4a7fff 100%)"
              : "var(--surface-2)",
            border: listening
              ? "none"
              : "1.5px solid var(--border-2)",
            boxShadow: listening
              ? "0 0 0 2px var(--blue), 0 0 32px rgba(61,127,255,0.6), 0 8px 24px rgba(0,0,0,0.5)"
              : "0 0 0 1px rgba(61,127,255,0.15), 0 4px 16px rgba(0,0,0,0.4)",
          }}
          aria-label={listening ? "Listening" : "Hold to talk"}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={listening ? "#0a1428" : "var(--blue-bright)"}
            strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>

      {/* Status */}
      <span
        className="text-[11px] font-medium tracking-wide transition-colors duration-200"
        style={{ color: listening ? "var(--blue-bright)" : "var(--text-3)" }}
      >
        {listening ? "Listening…" : "Hold to talk"}
      </span>

      {/* Transcript preview */}
      {transcript && (
        <div
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-[12px]"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text)" }}
        >
          <span className="flex-1 truncate italic" style={{ color: "var(--text-2)" }}>{transcript}</span>
          <button
            onClick={handleSubmitTranscript}
            className="text-[10px] font-bold uppercase tracking-widest shrink-0 transition-colors"
            style={{ color: "var(--blue-bright)" }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

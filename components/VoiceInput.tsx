"use client";

import { useRef, useEffect, useState } from "react";

type AnyRecognition = any;

interface VoiceMicProps {
  /** Called with the live interim transcript so the parent can fill its input */
  onTranscript: (text: string) => void;
  /** Notifies parent of listening state so it can style the input */
  onListeningChange: (listening: boolean) => void;
  listening: boolean;
  disabled?: boolean;
}

/**
 * Compact inline mic button — no separate transcript area.
 * Hold to record; releases fill the parent's text input for editing.
 */
export default function VoiceMic({ onTranscript, onListeningChange, listening, disabled }: VoiceMicProps) {
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
        const text = Array.from(event.results as AnyRecognition[])
          .map((r: AnyRecognition) => r[0].transcript as string)
          .join(" ");
        onTranscript(text);
      };
      recognition.onend = () => {
        if (isHoldingRef.current) {
          try { recognition.start(); } catch { /* already starting */ }
        } else {
          onListeningChange(false);
        }
      };
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Speech Recognition init failed", e);
      setSupported(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startListening() {
    if (!recognitionRef.current || disabled) return;
    isHoldingRef.current = true;
    onTranscript("");
    onListeningChange(true);
    try { recognitionRef.current.start(); } catch { /* already running */ }
  }

  function stopListening() {
    if (!recognitionRef.current) return;
    isHoldingRef.current = false;
    onListeningChange(false);
    recognitionRef.current.stop();
  }

  if (!supported) return null;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
      {/* Sonar rings when listening */}
      {listening && (
        <>
          <span className="sonar-ring" style={{ width: 40, height: 40 }} />
          <span className="sonar-ring" style={{ width: 40, height: 40, animationDelay: "0.65s" }} />
        </>
      )}
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={(e) => { e.preventDefault(); startListening(); }}
        onTouchEnd={stopListening}
        disabled={disabled}
        aria-label={listening ? "Listening" : "Hold to speak"}
        className="relative z-10 flex items-center justify-center rounded-full transition-all duration-200 select-none disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          width: 36,
          height: 36,
          background: listening
            ? "radial-gradient(circle at 40% 35%, #fff 0%, #c8d8ff 50%, #4a7fff 100%)"
            : "var(--surface-2)",
          border: listening ? "none" : "1.5px solid var(--border-2)",
          boxShadow: listening
            ? "0 0 0 2px var(--blue), 0 0 20px rgba(61,127,255,0.55)"
            : "none",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={listening ? "#0a1428" : "var(--blue-bright)"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    </div>
  );
}

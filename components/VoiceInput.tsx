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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SR) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const result = Array.from(event.results)
          // @ts-ignore
          .map((r: any) => r[0].transcript)
          .join(" ");
        setTranscript(result);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Failed to initialize Speech Recognition", e);
      setSupported(false);
    }
  }, []);

  function startListening() {
    if (!recognitionRef.current || disabled) return;
    setTranscript("");
    setListening(true);
    recognitionRef.current.start();
  }

  function stopListening() {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  }

  function handleSubmitTranscript() {
    if (!transcript.trim()) return;
    onTranscript(transcript.trim());
    setTranscript("");
  }

  if (!supported) {
    return (
      <div className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>
        Voice not supported in this browser. Use Chrome for push-to-talk.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
        Voice Command
      </span>

      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        disabled={disabled}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed ${
          listening ? "mic-glow" : "glow-blue"
        }`}
        style={{
          background: listening
            ? "radial-gradient(circle, #ffffff 0%, #d0e8ff 60%, #a0c8f0 100%)"
            : "radial-gradient(circle, #e8f0ff 0%, #a0c4f0 60%, #4a90d9 100%)",
          border: listening ? "none" : "2px solid rgba(74,144,217,0.4)",
        }}
        aria-label={listening ? "Listening" : "Hold to talk"}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke={listening ? "#05080f" : "#05080f"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      <span className="text-[13px] font-medium" style={{ color: listening ? "var(--accent)" : "var(--text-secondary)" }}>
        {listening ? "I'm listening..." : "Hold to talk"}
      </span>

      {transcript && (
        <div className="flex items-center gap-2 w-full rounded-full px-4 py-2 text-[13px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}>
          <span className="flex-1 truncate">{transcript}</span>
          <button
            onClick={handleSubmitTranscript}
            className="font-bold uppercase tracking-wider text-[10px]"
            style={{ color: "var(--accent)" }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

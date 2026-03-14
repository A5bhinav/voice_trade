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
  const isHoldingRef = useRef(false); // tracks whether button is physically held

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as AnyRecognition;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SR) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SR();
      recognition.continuous = true;      // don't stop on silence
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: AnyRecognition) => {
        const result = Array.from(event.results as AnyRecognition[])
          .map((r: AnyRecognition) => r[0].transcript as string)
          .join(" ");
        setTranscript(result);
      };

      recognition.onend = () => {
        // If the user is still holding the button, the API stopped on its own — restart it
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
      <div className="text-xs text-zinc-500 text-center py-2">
        Voice not supported in this browser. Use Chrome for push-to-talk.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transcript && (
        <div className="flex items-center gap-2 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-200">
          <span className="flex-1">{transcript}</span>
          <button
            onClick={handleSubmitTranscript}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
          >
            Send
          </button>
        </div>
      )}
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        disabled={disabled}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors select-none ${
          listening
            ? "bg-red-600 text-white animate-pulse"
            : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {listening ? "🎙 Listening… (release to stop)" : "Hold to Talk"}
      </button>
    </div>
  );
}

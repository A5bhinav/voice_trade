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
      <div className="text-xs text-zinc-500 text-center py-2">
        Voice not supported in this browser. Use Chrome for push-to-talk.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transcript && (
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] text-black shadow-sm">
          <span className="flex-1 truncate">{transcript}</span>
          <button
            onClick={handleSubmitTranscript}
            className="text-black hover:text-zinc-600 font-bold uppercase tracking-wider text-[10px]"
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
        className={`w-full py-4 rounded-full font-bold text-[14px] uppercase tracking-wider transition-all select-none shadow-sm border ${
          listening
            ? "bg-red-500 text-white border-red-500 shadow-red-500/20"
            : "bg-white text-black border-zinc-200 hover:border-black hover:bg-zinc-50 outline-none"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {listening ? "🎙 Listening…" : "Hold to Talk"}
      </button>
    </div>
  );
}

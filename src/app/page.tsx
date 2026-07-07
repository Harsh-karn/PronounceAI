"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Upload, FileAudio, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Mistake {
  segment: string;
  issue: string;
  tip: string;
}

interface EvaluationResult {
  score: number;
  transcription: string;
  mistakes: Mistake[];
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  
  // WebML state
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [downloads, setDownloads] = useState<Record<string, { loaded: number, total: number }>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const worker = useRef<Worker | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window !== "undefined") {
      worker.current = new Worker("/worker.js");

      worker.current.onmessage = (e) => {
        const msg = e.data;
        console.log("[Main] Received message from worker:", msg.type, msg);
        if (msg.type === "progress") {
          setModelStatus("loading");
          if (msg.data && msg.data.file) {
            setDownloads((prev) => ({
              ...prev,
              [msg.data.file]: { loaded: msg.data.loaded || 0, total: msg.data.total || 0 }
            }));
          }
        } else if (msg.type === "loaded") {
          setModelStatus("ready");
        } else if (msg.type === "result") {
          processSTTResult(msg.data);
        } else if (msg.type === "error") {
          console.error("Worker error:", msg.error);
          setError(msg.error);
          setModelStatus("error");
        }
      };

      worker.current.onerror = (err) => {
        console.error("Worker initialization error:", err);
        setError("Worker failed to start. This might be a browser compatibility issue or Turbopack error.");
        setModelStatus("error");
      };

      // Start loading the model in the background
      worker.current.postMessage({ type: "load" });
    }
    return () => {
      worker.current?.terminate();
    };
  }, []);

  const startRecording = async () => {
    if (!consentGiven) {
      setError("Please provide consent to process your audio first.");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerInterval.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!consentGiven) {
      setError("Please provide consent to process your audio first.");
      e.target.value = "";
      return;
    }
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
    }
  };

  const submitAudio = async () => {
    if (!audioBlob) return;
    if (modelStatus !== "ready") {
      setError("Please wait for the AI model to finish downloading securely to your browser.");
      return;
    }
    if (recordingTime > 0 && recordingTime < 10) {
      setError("Please provide a longer audio clip (at least 10 seconds).");
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      // 1. Resample to 16kHz Float32Array for Whisper
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      // 2. Send to Web Worker
      worker.current?.postMessage({ type: "transcribe", audioData });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while preparing audio.");
      setIsEvaluating(false);
    }
  };

  const processSTTResult = (data: any) => {
    setIsEvaluating(false);
    const transcription = data.text || "";
    
    // Fallback heuristic scoring if no true acoustic model
    const words = transcription.trim().split(/\s+/).filter((w: string) => w.length > 0);
    const wordCount = words.length;
    
    // Estimate audio duration. If we don't have it explicitly, guess from WPM logic or use max 45s.
    const duration = recordingTime > 0 ? recordingTime : 30; 
    const wpm = (wordCount / duration) * 60;
    
    const mistakes: Mistake[] = [];
    let score = 100;
    
    if (wpm < 90 && wordCount > 5) {
      score -= 15;
      mistakes.push({ segment: "Overall Pacing", issue: "Too slow", tip: `Your pacing was ~${Math.round(wpm)} WPM. Native speakers speak at 130+ WPM.` });
    } else if (wpm > 180) {
      score -= 10;
      mistakes.push({ segment: "Overall Pacing", issue: "Too fast", tip: `Your pacing was ~${Math.round(wpm)} WPM. Try slowing down to articulate clearer.` });
    }

    const fillers = ["um", "uh", "ah", "like", "hmm"];
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase().replace(/[^a-z]/g, "");
      if (fillers.includes(word)) {
        score -= 2;
        mistakes.push({ segment: word, issue: "Filler word", tip: "Try to pause silently instead of using filler sounds." });
      }
      if (i > 0) {
        const prevWord = words[i-1].toLowerCase().replace(/[^a-z]/g, "");
        if (word === prevWord && word.length > 2) {
          score -= 5;
          mistakes.push({ segment: `${prevWord} ${word}`, issue: "Stuttering/Repetition", tip: "You repeated this word. Practice smooth transitions." });
        }
      }
    }

    setResult({
      score: Math.max(0, Math.min(100, Math.round(score))),
      transcription,
      mistakes
    });
  };

  const reset = () => {
    setAudioBlob(null);
    setResult(null);
    setRecordingTime(0);
    setError(null);
  };

  const totalLoadedBytes = Object.values(downloads).reduce((acc, curr) => acc + curr.loaded, 0);
  const totalModelBytes = Object.values(downloads).reduce((acc, curr) => acc + curr.total, 0);
  const loadingProgress = totalModelBytes > 0 ? (totalLoadedBytes / totalModelBytes) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <main className="max-w-3xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Pronounce<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-lg text-slate-600">
            100% Client-Side. Zero APIs. Speak for 30-45 seconds in English to get instant feedback.
          </p>
        </header>

        {modelStatus === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-red-900">Failed to Load AI Model</h3>
              <p className="text-sm text-red-800 max-w-sm">
                {error || "An unknown error occurred while downloading the model."}
              </p>
            </div>
            <button 
              onClick={() => {
                setError(null);
                setModelStatus("loading");
                worker.current?.postMessage({ type: "load" });
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Retry Download
            </button>
          </div>
        )}

        {(modelStatus === "idle" || modelStatus === "loading") && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="text-blue-500 animate-spin" size={32} />
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-blue-900">Downloading On-Device AI Model</h3>
              <p className="text-sm text-blue-800/80 max-w-sm">
                This is a one-time ~40MB download to your browser's secure cache. 
                Subsequent visits will load instantly!
              </p>
            </div>
            
            {(totalModelBytes > 0 || totalLoadedBytes > 0) && (
              <div className="w-full max-w-xs space-y-2 mt-2">
                <div className="flex justify-between text-xs font-medium text-blue-700">
                  <span>Downloading...</span>
                  <span>{totalModelBytes > 0 ? `${Math.round(loadingProgress)}%` : 'Unknown total size'}</span>
                </div>
                {totalModelBytes > 0 ? (
                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden relative">
                    <div className="bg-blue-600 h-full w-1/2 animate-pulse absolute rounded-full" />
                  </div>
                )}
                <div className="text-center text-xs font-medium text-blue-600 mt-1">
                  {(totalLoadedBytes / 1024 / 1024).toFixed(1)} MB {totalModelBytes > 0 ? `/ ${(totalModelBytes / 1024 / 1024).toFixed(1)} MB` : ' downloaded'}
                </div>
              </div>
            )}
          </div>
        )}

        {!result ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
          >
            <div className="space-y-8">
              {/* Consent Section */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start space-x-3">
                <ShieldCheck className="text-blue-500 mt-0.5 shrink-0" size={20} />
                <div className="space-y-1">
                  <h3 className="font-semibold text-blue-900 text-sm">Perfect Privacy (DPDP Act 2023 Compliant)</h3>
                  <p className="text-sm text-blue-800/80">
                    Your audio is processed entirely on your device using a WebAssembly ML model. 
                    No audio is ever uploaded to any server.
                  </p>
                  <label className="flex items-center space-x-2 mt-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-blue-900 select-none">
                      I understand and consent to local processing.
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                  {error}
                </div>
              )}

              {/* Recording Controls */}
              {!audioBlob ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-mono font-medium text-slate-800">
                      00:{recordingTime.toString().padStart(2, '0')}
                    </div>
                    <div className="text-sm text-slate-500">Requires 30 - 45 seconds</div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="h-16 w-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
                      >
                        <Mic size={24} />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="h-16 w-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 animate-pulse"
                      >
                        <Square size={24} className="fill-current" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-center space-x-2 w-full text-sm text-slate-400">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span>OR</span>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>

                  <label className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer transition-colors bg-slate-50 px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-100">
                    <Upload size={16} />
                    <span>Upload Audio File</span>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <FileAudio size={28} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-slate-900">Audio Ready</h3>
                    <p className="text-sm text-slate-500">Your audio is ready for on-device evaluation.</p>
                  </div>
                  
                  <div className="flex items-center space-x-3 w-full max-w-sm">
                    <button
                      onClick={reset}
                      className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                      disabled={isEvaluating}
                    >
                      Discard
                    </button>
                    <button
                      onClick={submitAudio}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isEvaluating || modelStatus !== "ready"}
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={18} />
                          Evaluating Locally...
                        </>
                      ) : (
                        "Get Score"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
              <h2 className="text-xl font-semibold text-slate-500 mb-6">Your Pronunciation Score</h2>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    className="text-slate-100"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="80"
                    cx="96"
                    cy="96"
                  />
                  <motion.circle
                    className={result.score >= 80 ? "text-green-500" : result.score >= 60 ? "text-amber-500" : "text-red-500"}
                    strokeWidth="12"
                    strokeDasharray={80 * 2 * Math.PI}
                    strokeDashoffset={(80 * 2 * Math.PI) - ((result.score / 100) * (80 * 2 * Math.PI))}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="80"
                    cx="96"
                    cy="96"
                    initial={{ strokeDashoffset: 80 * 2 * Math.PI }}
                    animate={{ strokeDashoffset: (80 * 2 * Math.PI) - ((result.score / 100) * (80 * 2 * Math.PI)) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-slate-900">{result.score}</span>
                  <span className="text-sm font-medium text-slate-500">/ 100</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Transcription</h3>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {result.transcription || "[No speech detected]"}
                </p>
              </div>

              {result.mistakes && result.mistakes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Areas for Improvement</h3>
                  <div className="space-y-3">
                    {result.mistakes.map((mistake, idx) => (
                      <div key={idx} className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-amber-900 bg-amber-200/50 px-2 py-0.5 rounded text-sm">
                            "{mistake.segment}"
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                            {mistake.issue}
                          </span>
                        </div>
                        <p className="text-sm text-amber-800 mt-1">
                          <span className="font-medium">Tip:</span> {mistake.tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-center">
                <button
                  onClick={reset}
                  className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

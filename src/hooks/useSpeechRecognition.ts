import { useState, useRef, useEffect, useCallback } from "react";
import { ModelStatus, DownloadsState, EvaluationResult } from "../types";
import { prepareAudioForModel } from "../utils/audio";
import { evaluateTranscription } from "../utils/evaluation";

export function useSpeechRecognition() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [downloads, setDownloads] = useState<DownloadsState>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const worker = useRef<Worker | null>(null);
  
  // Track ongoing evaluation callback
  const onResultRef = useRef<((result: EvaluationResult) => void) | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      worker.current = new Worker("/worker.js", { type: "module" });

      worker.current.onmessage = (e) => {
        const msg = e.data;
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
          setIsEvaluating(false);
          const transcription = msg.data.text || "";
          
          if (onResultRef.current) {
            // We temporarily store transcription; the caller handles passing recordingTime
            // by calling a function, but for now we'll just expose the raw callback mechanism.
          }
        } else if (msg.type === "error") {
          setIsEvaluating(false);
          console.error("Worker error:", msg.error);
          setError(msg.error);
          setModelStatus("error");
        }
      };

      worker.current.onerror = (err) => {
        setIsEvaluating(false);
        console.error("Worker initialization error:", err);
        setError("Worker failed to start. This might be a browser compatibility issue or Turbopack error.");
        setModelStatus("error");
      };

      worker.current.postMessage({ type: "load" });
    }
    return () => {
      worker.current?.terminate();
    };
  }, []);

  const evaluateAudio = useCallback(async (audioBlob: Blob, recordingTime: number) => {
    if (modelStatus !== "ready") {
      setError("Please wait for the AI model to finish downloading securely to your browser.");
      return;
    }
    
    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      const audioData = await prepareAudioForModel(audioBlob);
      
      // Override onmessage to handle this specific result
      if (worker.current) {
        const originalOnMessage = worker.current.onmessage;
        worker.current.onmessage = (e) => {
          if (e.data.type === "result") {
            setIsEvaluating(false);
            const transcription = e.data.data.text || "";
            const evaluation = evaluateTranscription(transcription, recordingTime);
            setResult(evaluation);
            // Restore original handler for future progress/status updates
            if (originalOnMessage) worker.current!.onmessage = originalOnMessage;
          } else if (originalOnMessage) {
             // Pass through other messages
             originalOnMessage.call(worker.current, e);
          }
        };
        
        worker.current.postMessage({ type: "transcribe", audioData });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while preparing audio.");
      setIsEvaluating(false);
    }
  }, [modelStatus]);

  const resetResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    modelStatus,
    downloads,
    isEvaluating,
    result,
    error,
    setError,
    evaluateAudio,
    resetResult,
    setModelStatus
  };
}

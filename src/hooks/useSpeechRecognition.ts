import { useState, useCallback } from "react";
import { EvaluationResult } from "../types";

export function useSpeechRecognition() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluateAudio = useCallback(async (audioBlob: Blob) => {
    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred while evaluating audio.";
      setError(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  const resetResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    isEvaluating,
    result,
    error,
    setError,
    evaluateAudio,
    resetResult,
    // Provide mocked status values for UI compatibility while refactoring
    modelStatus: "ready" as const,
    downloads: {},
    setModelStatus: () => {}
  };
}

"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { PrivacyConsent } from "../components/PrivacyConsent";
import { RecorderInterface } from "../components/RecorderInterface";
import { EvaluationResults } from "../components/EvaluationResults";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

export default function Home() {
  const [consentGiven, setConsentGiven] = useState(false);

  const {
    isRecording,
    recordingTime,
    audioBlob,
    error: recorderError,
    setError: setRecorderError,
    startRecording,
    stopRecording,
    setManualAudio,
    resetRecording,
    setRecordingTime,
  } = useAudioRecorder(45);

  const {
    isEvaluating,
    result,
    error: speechError,
    evaluateAudio,
    resetResult,
  } = useSpeechRecognition();

  const handleStartRecording = () => {
    if (!consentGiven) {
      setRecorderError("Please provide consent to process your audio first.");
      return;
    }
    startRecording();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!consentGiven) {
      setRecorderError("Please provide consent to process your audio first.");
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audioUrl);
        const duration = Math.round(audio.duration);
        if (duration < 30 || duration > 46) { // 46 to allow slightly over 45s rounding
          setRecorderError(`Audio uploads must be between 30 and 45 seconds (yours is ~${duration}s).`);
          return;
        }
        setRecordingTime(duration);
        setManualAudio(file);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setRecorderError("Could not read audio file duration. Please try a different file.");
      };
    }
  };

  const handleSubmitAudio = () => {
    if (!audioBlob) return;
    if (recordingTime < 30) {
      setRecorderError(`Please provide a longer audio clip (at least 30 seconds). Yours was ~${recordingTime}s.`);
      return;
    }
    evaluateAudio(audioBlob);
  };

  const handleReset = () => {
    resetRecording();
    resetResult();
  };

  const displayError = recorderError || speechError;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <main className="max-w-3xl mx-auto space-y-12">
        <Header />

        {displayError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 text-center shadow-sm">
            {displayError}
          </div>
        )}

        <div className="space-y-8 animate-in fade-in duration-700">
          {!result ? (
            <>
              <PrivacyConsent 
                consentGiven={consentGiven} 
                onConsentChange={setConsentGiven} 
              />
              
              <RecorderInterface
                isRecording={isRecording}
                recordingTime={recordingTime}
                hasAudio={!!audioBlob}
                isEvaluating={isEvaluating}
                onStartRecording={handleStartRecording}
                onStopRecording={stopRecording}
                onSubmit={handleSubmitAudio}
                onFileUpload={handleFileUpload}
              />
            </>
          ) : (
            <EvaluationResults 
              result={result} 
              onReset={handleReset} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

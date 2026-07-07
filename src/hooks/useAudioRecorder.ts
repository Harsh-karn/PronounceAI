import { useState, useRef } from "react";

export function useAudioRecorder(maxDurationSeconds = 45) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async (onNotAllowed?: () => void) => {
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
          if (prev >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please ensure permissions are granted.");
      if (onNotAllowed) onNotAllowed();
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

  const setManualAudio = (blob: Blob | null) => {
    setAudioBlob(blob);
    setError(null);
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
  };

  return {
    isRecording,
    recordingTime,
    audioBlob,
    error,
    setError,
    startRecording,
    stopRecording,
    setManualAudio,
    resetRecording,
    setRecordingTime,
  };
}

import { EvaluationResult, Mistake } from "../types";

export function evaluateTranscription(transcription: string, recordingTime: number): EvaluationResult {
  const words = transcription.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  
  // Estimate audio duration. If we don't have it explicitly, guess from WPM logic or use max 45s.
  const duration = recordingTime > 0 ? recordingTime : 30; 
  const wpm = (wordCount / duration) * 60;
  
  const mistakes: Mistake[] = [];
  let score = 100;
  
  if (wpm < 90 && wordCount > 5) {
    score -= 15;
    mistakes.push({ 
      segment: "Overall Pacing", 
      issue: "Too slow", 
      tip: `Your pacing was ~${Math.round(wpm)} WPM. Native speakers speak at 130+ WPM.` 
    });
  } else if (wpm > 180) {
    score -= 10;
    mistakes.push({ 
      segment: "Overall Pacing", 
      issue: "Too fast", 
      tip: `Your pacing was ~${Math.round(wpm)} WPM. Try slowing down to articulate clearer.` 
    });
  }

  const fillers = ["um", "uh", "ah", "like", "hmm"];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, "");
    if (fillers.includes(word)) {
      score -= 2;
      mistakes.push({ 
        segment: word, 
        issue: "Filler word", 
        tip: "Try to pause silently instead of using filler sounds." 
      });
    }
    if (i > 0) {
      const prevWord = words[i-1].toLowerCase().replace(/[^a-z]/g, "");
      if (word === prevWord && word.length > 2) {
        score -= 5;
        mistakes.push({ 
          segment: `${prevWord} ${word}`, 
          issue: "Stuttering/Repetition", 
          tip: "You repeated this word. Practice smooth transitions." 
        });
      }
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    transcription,
    mistakes
  };
}

# PronounceAI System Architecture (Client-Side No-API Version)

This document describes the end-to-end system architecture of PronounceAI, a web application that evaluates English pronunciation for language learners natively in the browser without any third-party APIs.

## System Components

1. **Frontend (Next.js & React)**
   - **Framework**: Next.js 14 App Router.
   - **Styling**: Tailwind CSS for a premium, responsive interface.
   - **Audio Capture**: Utilizes the browser's native `MediaRecorder` API to capture microphone input directly in the browser. It enforces a strict 30-45 second duration limit.
   - **File Upload**: Supports direct `.wav` or `.mp3` uploads as an alternative to recording.

2. **Web Worker Engine (Transformers.js)**
   - A background Web Worker thread is initialized to run `@xenova/transformers`.
   - We utilize the `Xenova/whisper-tiny.en` automatic speech recognition model.
   - **Why this over alternatives?** 
     - Running the model entirely on the client-side using WebAssembly eliminates the need for expensive backend infrastructure or third-party API keys (like Gemini or Azure). It ensures perfect data privacy as audio data never leaves the device.

3. **Heuristic Evaluation Algorithm**
   - Because we do not rely on an external LLM for "judgment," the frontend implements a custom heuristic algorithm to evaluate the STT output:
     - **Pacing**: Calculates Words Per Minute (WPM).
     - **Stuttering**: Detects repeated words indicative of hesitation.
     - **Filler Words**: Identifies common fillers ("um", "uh", "like") and penalizes the score while providing actionable feedback.

## Data Flow
1. User grants microphone access (after checking the DPDP consent box).
2. User records 30-45 seconds of speech.
3. The frontend resamples the audio to a 16kHz `Float32Array` required by Whisper.
4. The audio data is dispatched to the background Web Worker.
5. The Web Worker processes the audio using the local Whisper model and returns the transcription to the main thread.
6. The main thread runs the heuristic evaluation algorithm on the transcript.
7. The UI renders the final score out of 100, the transcription, and the highlighted mistakes.

---

## DPDP Act 2023 Compliance Posture

Livo AI takes data privacy seriously. PronounceAI is designed with the strictest possible adherence to India's Digital Personal Data Protection (DPDP) Act 2023.

1. **Perfect Data Minimization (Zero Data Transfer)**
   - By running the entire inference pipeline in the browser using WebAssembly, **no personal data (voice recordings) ever leaves the user's device.**
   - We do not transmit data to our servers, nor do we transmit it to any third parties (like Google or OpenAI).

2. **Notice & Explicit Consent**
   - Before recording or uploading, users must check a box providing explicit, affirmative consent for their voice to be processed locally.

3. **Storage Limitation & Erasure**
   - **Storage**: No user audio or evaluation results are ever stored on a database. 
   - **Retention**: Processing is done entirely in the browser's volatile memory (RAM). Once the browser tab is closed or the user hits "Discard," the memory is freed by the garbage collector.

---

## Trade-offs & Future Improvements

**Trade-offs made:**
- **Client-Side Model Size vs Quality**: Running ML in the browser requires downloading the model weights (~40MB for `whisper-tiny.en`). This means the first evaluation might be slower due to the download, and the `tiny` model is slightly less accurate than cloud-based massive models (like Whisper `large-v3` or Gemini 1.5). However, this trade-off is absolutely worth it for the perfect privacy posture and the removal of API costs/dependencies.
- **Heuristic Scoring vs Acoustic Scoring**: Our custom JavaScript heuristic relies on the STT output string (analyzing pacing and filler words) rather than deep acoustic phoneme-level mapping. 

**What I would build next with another week:**
- Implement phoneme-level confidence extraction from the Web Worker to highlight specific syllables the user struggled with.
- Add user accounts using a secure, local-first database (like IndexedDB or PWA features) so users can track their progress over time without compromising their privacy.

# PronounceAI System Architecture

This document describes the architecture of PronounceAI, a client-side web application designed to evaluate English pronunciation for language learners without relying on third-party APIs.

## System Components

1. **Frontend (Next.js & React)**
   - **Framework**: Next.js 14 App Router.
   - **Styling**: Tailwind CSS.
   - **Audio Capture**: Uses the browser's native `MediaRecorder` API to capture microphone input, enforcing a 30-45 second duration limit.
   - **File Upload**: Allows users to upload `.wav` or `.mp3` files, validating that the file length falls within the 30-45 second constraint.

2. **Web Worker Engine (Transformers.js)**
   - A background Web Worker runs `@xenova/transformers`.
   - The app uses the `Xenova/whisper-tiny.en` automatic speech recognition (ASR) model.
   - **Why this model?** Running the model locally via WebAssembly removes the need for backend infrastructure and external API keys (e.g., OpenAI or Azure). It also inherently solves data residency and privacy concerns by processing audio locally on the user's machine.

3. **Heuristic Evaluation Algorithm**
   - Instead of using an LLM to judge pronunciation, the frontend uses a heuristic algorithm applied to the speech-to-text (STT) output:
     - **Pacing**: Calculates Words Per Minute (WPM) to check if the user is speaking too quickly or too slowly.
     - **Stuttering**: Detects repeated words, which often indicate hesitation.
     - **Filler Words**: Checks the transcript for common fillers ("um", "uh", "like") to penalize the score and provide specific feedback on where the user hesitated.

## Data Flow

1. The user checks the DPDP consent box and grants microphone access or uploads a file.
2. The user provides 30-45 seconds of speech.
3. The frontend resamples the audio into a 16kHz `Float32Array` required by Whisper.
4. The array is passed to the background Web Worker.
5. The Web Worker processes the audio through the local Whisper model and returns the transcript.
6. The main thread passes the transcript into the heuristic evaluation algorithm.
7. The UI displays the score out of 100, the full transcription, and highlights specific mistakes.

---

## DPDP Act 2023 Compliance

PronounceAI handles user data in compliance with India's Digital Personal Data Protection (DPDP) Act 2023:

1. **Data Minimization and Transfer**
   - By running inference in the browser via WebAssembly, audio recordings never leave the user's device. No data is sent to our servers or third-party APIs.
   
2. **Consent**
   - The UI includes a mandatory checkbox to obtain explicit, affirmative consent for local audio processing before the user can upload or record.

3. **Storage and Retention**
   - No user audio or evaluation data is stored in a database.
   - Audio processing occurs entirely in the browser's volatile memory (RAM). When the user closes the tab or resets the application, the memory is cleared by the garbage collector.

---

## Trade-offs & Future Improvements

**Trade-offs made:**
- **Client-Side Model Size vs. Quality**: The browser must download the model weights (~40MB for `whisper-tiny.en`) on the first load, which takes time. Additionally, the `tiny` model has a higher word error rate compared to larger cloud models (like Whisper `large-v3`). This trade-off was chosen to prioritize zero-cost scaling and complete user privacy.
- **Heuristic vs. Acoustic Scoring**: The current scoring system analyzes the text output (WPM, fillers, stuttering) rather than mapping acoustic phonemes to an expected pronunciation model. This is simpler to implement but misses subtle mispronunciations of individual syllables.

**What I would build next with more time:**
- Modify the Web Worker output to return phoneme-level confidence scores, allowing the UI to highlight the exact syllables a user mispronounced.
- Add an opt-in local database (like IndexedDB) so users can track their progress across sessions while maintaining local-only storage.

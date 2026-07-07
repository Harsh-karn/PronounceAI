# PronounceAI System Architecture

This document describes the end-to-end system architecture of PronounceAI, a web application that evaluates English pronunciation for language learners.

## System Components

1. **Frontend (Next.js & React)**
   - **Framework**: Next.js 14 App Router.
   - **Styling**: Tailwind CSS for a premium, responsive interface.
   - **Audio Capture**: Utilizes the browser's native `MediaRecorder` API to capture microphone input directly in the browser. It enforces a strict 30-45 second duration limit per the requirements.
   - **File Upload**: Supports direct `.wav` or `.mp3` uploads as an alternative to recording.

2. **Backend API (Next.js Route Handler)**
   - Acts as a secure proxy and orchestration layer.
   - Receives the `multipart/form-data` audio blob from the client.
   - Instantiates the connection to the Google Gemini API.

3. **AI Engine (Google Gemini API)**
   - We utilize the `gemini-1.5-flash` model, which features native multimodal audio understanding capabilities.
   - **Why this over alternatives?** 
     - Traditional architectures (e.g., OpenAI Whisper + LLM) require splitting the pipeline into Speech-to-Text and Text-to-Text. Whisper does not natively output a "pronunciation score," making it difficult to judge phoneme-level accuracy without complex acoustic models.
     - Gemini 1.5 processes the raw audio directly alongside our system instructions. It acts as an expert judge, scoring the pronunciation based on the acoustic characteristics of the speech and returning a structured JSON containing the overall score, transcription, and specific mistake highlights (with timestamps and feedback).

## Data Flow
1. User grants microphone access (after checking the DPDP consent box).
2. User records 30-45 seconds of speech.
3. The frontend packages the recording into a `FormData` object and POSTs to `/api/evaluate`.
4. The Next.js backend reads the file into a temporary buffer (in-memory) and sends it to the Gemini API as an inline data part.
5. Gemini processes the audio and returns a JSON payload with the evaluation.
6. The backend immediately discards the audio buffer and forwards the JSON to the frontend.
7. The frontend renders the score, transcription, and highlighted mistakes.

---

## DPDP Act 2023 Compliance Posture

Livo AI takes data privacy seriously. PronounceAI is designed with strict adherence to India's Digital Personal Data Protection (DPDP) Act 2023.

1. **Notice & Explicit Consent**
   - Before recording or uploading, users must check a box providing explicit, affirmative consent for their voice to be processed.
   - The UI includes a clear notice stating the purpose of processing (pronunciation evaluation).

2. **Data Minimization & Storage Limitation (Zero Retention)**
   - **Storage**: No user audio or evaluation results are ever stored on a disk or database. 
   - **Retention**: Processing is done entirely in-memory (`Buffer`). The audio data only exists in RAM for the duration of the API request and is instantly garbage-collected once the request completes.
   - Because there is no persistent storage, there is zero retention, satisfying the requirement to delete data once the purpose is served.

3. **Data Residency & Third-Party Processing**
   - The data is sent securely via TLS to the Google Gemini API for the sole purpose of inference. Google Cloud provides enterprise-grade data processing agreements ensuring data is not used to train their public models without consent.

4. **Right to Erasure**
   - Since no personal data is retained, the system achieves "erasure by design."

---

## Trade-offs & Future Improvements

**Trade-offs made:**
- **Single-API Architecture vs. Specialized Acoustic Models**: Using an LLM (Gemini) for audio evaluation is incredibly flexible and provides fantastic natural language feedback. However, it may not be as perfectly phonetically accurate as a dedicated, narrow acoustic model (like Azure Speech Pronunciation Assessment). I chose Gemini to demonstrate modern generative AI plumbing and to provide more conversational, actionable tips for learners.
- **In-Memory Processing**: By not using cloud storage (like AWS S3) for the uploads, we ensure absolute DPDP compliance and speed. The trade-off is that very large files would consume server RAM, but since we strictly enforce a 45-second limit, this is well within Vercel's serverless function memory limits.

**What I would build next with another week:**
- Implement detailed phoneme-level highlight rendering using a specialized model.
- Add user accounts (with proper DPDP-compliant data management and withdrawal of consent workflows) so users can track their progress over time.
- Implement streaming transcription so users can see the STT output in real-time as they speak.

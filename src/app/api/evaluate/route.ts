import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize the SDK. It automatically picks up GEMINI_API_KEY from the environment.
const ai = new GoogleGenAI({});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    // Read the file into a Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure the size is reasonable (e.g. max 5MB for a 45s clip)
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large." }, { status: 400 });
    }

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: audioFile.type || "audio/webm",
              },
            },
            {
              text: `You are an expert English pronunciation coach. Listen to the provided audio file.
Your task is to evaluate the pronunciation of the speaker.
1. Transcribe the audio.
2. Give an overall pronunciation score from 0 to 100.
3. Identify specific words or segments that were mispronounced, stuttered, or unclear. 
For each mistake, provide:
- "segment": the word or phrase
- "issue": a short description of what went wrong (e.g., mispronounced, unclear)
- "tip": actionable advice on how to pronounce it correctly

Return the result STRICTLY as a JSON object with this structure:
{
  "score": 85,
  "transcription": "...",
  "mistakes": [
    { "segment": "example", "issue": "...", "tip": "..." }
  ]
}
Do not include markdown blocks like \`\`\`json. Just return the raw JSON object.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // Low temperature for more deterministic assessment
      }
    });

    const textOutput = response.text;
    
    if (!textOutput) {
      throw new Error("No response from Gemini");
    }

    // Try parsing the JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch (e) {
      console.error("Failed to parse Gemini output:", textOutput);
      return NextResponse.json({ error: "Failed to parse AI evaluation." }, { status: 500 });
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/evaluate:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

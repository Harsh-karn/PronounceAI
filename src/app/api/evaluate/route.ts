import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString("base64");
    const mimeType = audioFile.type || "audio/webm";

    const prompt = `
You are an expert pronunciation coach. 
Please analyze the provided audio clip and give feedback on the user's pronunciation, pacing, and use of filler words.

CRITICAL INSTRUCTION FOR MISTAKES:
When you identify a mistake (like a mispronunciation or filler word), the \`segment\` field MUST be an EXACT substring of the \`transcription\` text you provide. This is used to highlight the text in the UI. 
If the user said "um", transcription should include "um", and the segment should be exactly "um".
`.trim();

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        score: {
          type: Type.INTEGER,
          description: "0 to 100, where 100 is native-like perfect pronunciation",
        },
        transcription: {
          type: Type.STRING,
          description: "The full transcribed text of what the user said",
        },
        mistakes: {
          type: Type.ARRAY,
          description: "Array of areas for improvement",
          items: {
            type: Type.OBJECT,
            properties: {
              segment: {
                type: Type.STRING,
                description: "The specific word or phrase from the transcription. MUST be an exact substring of the transcription text.",
              },
              issue: {
                type: Type.STRING,
                description: "Short category like 'Mispronunciation', 'Filler word', 'Too fast', 'Stuttering'",
              },
              tip: {
                type: Type.STRING,
                description: "Helpful tip on how to fix it",
              },
            },
            required: ["segment", "issue", "tip"],
          },
        },
      },
      required: ["score", "transcription", "mistakes"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType,
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Evaluation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process audio";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

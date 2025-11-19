import { GoogleGenAI, Modality } from "@google/genai";
import { SEARCH_MODEL, TTS_MODEL } from "../constants";
import { SearchResult } from "../types";
import { base64ToUint8Array, decodeAudioData } from "../utils/audio";

// Initialize the client once.
// Note: In a production app, you might want to lazily init or handle key updates.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDailyTriviaFact = async (): Promise<SearchResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: "Find a fun, trending, or interesting trivia fact about Vietnam or the world from today or this week. Keep it short.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Could not retrieve a fact at this time.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
      .filter((source: any) => source !== null) as { uri: string; title: string }[];

    return { text, sources };
  } catch (error) {
    console.error("Error fetching trivia fact:", error);
    return { text: "Did you know? Vietnam is the world's second-largest coffee exporter!", sources: [] };
  }
};

export const playTextToSpeech = async (text: string, voiceName: string = 'Kore'): Promise<void> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    // Simple playback mechanism for TTS
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), audioContext, 24000, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

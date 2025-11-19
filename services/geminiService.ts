import { GoogleGenAI, Modality } from "@google/genai";
import { SEARCH_MODEL, TTS_MODEL } from "../constants";
import { SearchResult } from "../types";
import { base64ToUint8Array, decodeAudioData } from "../utils/audio";

// Singleton Audio Context for TTS to prevent browser limits and overlap
let ttsContext: AudioContext | null = null;
let currentTtsSource: AudioBufferSourceNode | null = null;

// In-memory cache for TTS audio buffers (Key: voiceName + text)
const ttsCache = new Map<string, AudioBuffer>();

const getTtsContext = () => {
  if (!ttsContext) {
    ttsContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (ttsContext.state === 'suspended') {
    ttsContext.resume();
  }
  return ttsContext;
};

export const stopTts = () => {
  if (currentTtsSource) {
    try {
      currentTtsSource.stop();
    } catch (e) {
      // Ignore errors if already stopped
    }
    currentTtsSource = null;
  }
};

// Initialize the client inside functions to handle potential env errors gracefully
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDailyTriviaFact = async (): Promise<SearchResult> => {
  try {
    const ai = getAiClient();
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
  // Stop any currently playing TTS before starting a new one
  stopTts();

  try {
    const ctx = getTtsContext();
    const cacheKey = `${voiceName}-${text}`;
    let audioBuffer: AudioBuffer;

    // 1. Check Cache
    if (ttsCache.has(cacheKey)) {
      audioBuffer = ttsCache.get(cacheKey)!;
    } else {
      // 2. Fetch if not in cache
      const ai = getAiClient();
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

      // 3. Decode and Store in Cache
      audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx, 24000, 1);
      ttsCache.set(cacheKey, audioBuffer);
    }
    
    // 4. Play Audio
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    currentTtsSource = source;
    
    source.onended = () => {
      if (currentTtsSource === source) {
        currentTtsSource = null;
      }
    };

    source.start();
  } catch (error) {
    console.error("TTS Error:", error);
  }
};
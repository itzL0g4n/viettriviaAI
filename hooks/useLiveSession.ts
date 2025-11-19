
import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audio';
import { LIVE_MODEL } from '../constants';
import { Score } from '../types';

// Define LiveSession type inference as it is not exported from the package
type LiveSession = Awaited<ReturnType<GoogleGenAI['live']['connect']>>;

interface UseLiveSessionProps {
  systemInstruction: string;
  voiceName: string;
  onVolumeChange: (vol: number) => void;
  onScoreUpdate?: (score: Score) => void;
}

const updateScoreTool: FunctionDeclaration = {
  name: 'updateScore',
  description: 'Updates the score. Call this IMMEDIATELY when the user answers correctly or incorrectly.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      playerScore: {
        type: Type.NUMBER,
        description: 'The new total score for the player.',
      },
      aiScore: {
        type: Type.NUMBER,
        description: 'The new total score for the AI host.',
      },
    },
    required: ['playerScore', 'aiScore'],
  },
};

export const useLiveSession = ({ systemInstruction, voiceName, onVolumeChange, onScoreUpdate }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for state that needs to be accessed in callbacks without dependency loops
  const isConnectedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  
  // Keep the latest callbacks in refs to avoid stale closures in long-running socket listeners
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onVolumeChangeRef = useRef(onVolumeChange);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  const disconnect = useCallback(() => {
    console.log("Disconnecting session...");
    isConnectedRef.current = false;
    
    // Stop audio processor first to stop sending data
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
      } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    sessionPromiseRef.current = null;

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      try { inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    if (onVolumeChangeRef.current) onVolumeChangeRef.current(0);
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      if (!process.env.API_KEY) {
         throw new Error("API_KEY is not defined. Check your environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }
      audioContextRef.current = outputCtx;
      
      // Request microphone with echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        } 
      });
      
      mediaStreamRef.current = stream;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;

      nextStartTimeRef.current = 0;

      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [updateScoreTool] }],
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setIsConnected(true);
            isConnectedRef.current = true;
            setIsConnecting(false);

            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
               // Strictly check connection state before processing
               if (!isConnectedRef.current || !sessionPromiseRef.current) return;

               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               
               sessionPromiseRef.current.then(session => {
                 if (isConnectedRef.current && session) {
                   try {
                      session.sendRealtimeInput({ media: pcmBlob });
                   } catch (err) {
                      // Suppress transient errors during transmission
                      console.warn("Send input error (ignored):", err);
                   }
                 }
               }).catch(err => {
                 // Ignore promise rejections for session access if we are disconnecting
                 console.warn("Session access error:", err);
               });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!isConnectedRef.current) return;

            if (msg.toolCall) {
              try {
                for (const fc of msg.toolCall.functionCalls) {
                  if (fc.name === 'updateScore') {
                    const newScore = { 
                      player: fc.args['playerScore'] as number, 
                      ai: fc.args['aiScore'] as number 
                    };
                    
                    if (onScoreUpdateRef.current) {
                      onScoreUpdateRef.current(newScore);
                    }

                    if (sessionRef.current) {
                       try {
                         sessionRef.current.sendToolResponse({
                           functionResponses: [{
                             id: fc.id,
                             name: fc.name,
                             response: { result: "OK" }
                           }]
                         });
                       } catch(e) {
                         console.error("Failed to send tool response:", e);
                       }
                    }
                  }
                }
              } catch (toolErr) {
                console.error("Error handling tool call:", toolErr);
              }
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              try {
                const ctx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(
                  base64ToUint8Array(base64Audio),
                  ctx,
                  24000,
                  1
                );

                if (!isConnectedRef.current) return;

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                const now = ctx.currentTime;
                const startTime = Math.max(now, nextStartTimeRef.current);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                
                source.start(startTime);
                sourcesRef.current.add(source);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                };
              } catch (decodeErr) {
                console.warn("Audio decode error", decodeErr);
              }
            }
            
            if (msg.serverContent?.interrupted) {
               console.log("Interrupted by user");
               sourcesRef.current.forEach(s => {
                 try { s.stop(); } catch(e){}
               });
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: (e) => {
            console.log('Session closed', e);
            if (isConnectedRef.current) disconnect();
          },
          onerror: (err: any) => {
            console.error('Session error caught:', err);
            if (err?.message?.includes("interrupted") || err?.message?.includes("abort")) return;
            
            // Better error messaging for Network Error
            let displayError = "Connection error.";
            if (err instanceof Error) {
                if (err.message.includes("Network error")) {
                    displayError = "Network connection unstable. Please verify your API Key and try again.";
                } else {
                    displayError = err.message;
                }
            }
            
            setError(displayError);
            disconnect();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
      const session = await sessionPromise;
      sessionRef.current = session;

    } catch (e: any) {
      console.error("Connection initialization failed", e);
      let errorMsg = e.message || "Failed to connect.";
      if (errorMsg.includes("API_KEY")) {
        errorMsg = "API Key is missing or invalid.";
      } else if (errorMsg.includes("Network")) {
        errorMsg = "Network error. Check connection/API key.";
      }
      setError(errorMsg);
      setIsConnecting(false);
      isConnectedRef.current = false;
      disconnect();
    }
  }, [systemInstruction, voiceName, isConnecting, isConnected, disconnect]);

  useEffect(() => {
    let animationFrame: number;
    const updateVolume = () => {
      animationFrame = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrame);
  }, [isConnected]);

  return { connect, disconnect, isConnected, isConnecting, error };
};

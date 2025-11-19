
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
  description: 'Updates the visual game score board. Call this whenever the score changes.',
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
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (sessionRef.current) {
      // Try catch close as it might already be closed
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
    // Reset volume visualization
    if (onVolumeChangeRef.current) onVolumeChangeRef.current(0);
  }, []);

  const connect = useCallback(async () => {
    // Prevent double connection attempts
    if (isConnecting || isConnected) {
      console.log("Already connected or connecting, ignoring connect request.");
      return;
    }
    
    setIsConnecting(true);
    setError(null);

    try {
      // Safety check for API Key environment
      if (!process.env.API_KEY) {
         throw new Error("API_KEY is not defined. Please check your environment settings.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Output Audio Context
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }
      audioContextRef.current = outputCtx;
      
      // 2. Input Audio Context (Mic)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      nextStartTimeRef.current = 0;

      // Create Session Promise
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

            // Setup Mic Stream only after connection is open
            const source = inputCtx.createMediaStreamSource(stream);
            // Reduced buffer size to 2048 for better responsiveness
            const processor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
               // CRITICAL: Only send data if we are actually connected AND session exists
               if (!isConnectedRef.current || !sessionPromiseRef.current) return;

               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               
               sessionPromiseRef.current.then(session => {
                 // Double check inside the promise resolution to avoid race conditions during disconnect
                 if (isConnectedRef.current && session) {
                   // Fix: Wrapped in try-catch as sendRealtimeInput returns void and cannot use .catch
                   try {
                      session.sendRealtimeInput({ media: pcmBlob });
                   } catch (err) {
                      console.warn("Dropped audio frame:", err);
                      // Do NOT disconnect here. Just drop the frame. 
                      // "Network Error" here is often transient (buffer full, etc).
                   }
                 }
               });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Guard: If we disconnected while processing a message, stop.
            if (!isConnectedRef.current) return;

            // Handle Tool Calls (Scoring)
            if (msg.toolCall) {
              try {
                for (const fc of msg.toolCall.functionCalls) {
                  if (fc.name === 'updateScore') {
                    const newScore = { 
                      player: fc.args['playerScore'] as number, 
                      ai: fc.args['aiScore'] as number 
                    };
                    
                    // Use Ref to access the latest callback closure
                    if (onScoreUpdateRef.current) {
                      onScoreUpdateRef.current(newScore);
                    }

                    // Send response back to model IMMEDIATELY using sessionRef
                    if (sessionRef.current) {
                       const response = {
                         functionResponses: [{
                           id: fc.id,
                           name: fc.name,
                           // Sending a very minimal response helps the model move on faster without talking about it
                           response: { result: "OK" }
                         }]
                       };
                       
                       try {
                         sessionRef.current.sendToolResponse(response);
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

            // Handle Audio
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

                // Additional guard after async decode
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
            // Only trigger disconnect if we aren't already doing it
            if (isConnectedRef.current) {
              disconnect();
            }
          },
          onerror: (err: any) => {
            console.error('Session error caught:', err);
            
            // Ignore minor audio context warnings or known non-fatal errors
            if (err?.message?.includes("interrupted") || err?.message?.includes("abort")) {
              return;
            }

            let errorMessage = "Connection error detected.";
            if (err instanceof Error) {
               errorMessage = err.message;
            } else if (err && typeof err === 'object') {
               if ('message' in err && typeof err.message === 'string' && err.message) {
                  errorMessage = err.message;
               }
            }
            
            setError(errorMessage);
            disconnect();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
      const session = await sessionPromise;
      sessionRef.current = session;

    } catch (e: any) {
      console.error("Connection initialization failed", e);
      setError(e.message || "Failed to connect. Please check API Key or Network.");
      setIsConnecting(false);
      isConnectedRef.current = false;
      disconnect();
    }
  }, [systemInstruction, voiceName, isConnecting, isConnected, disconnect]);

  useEffect(() => {
    let animationFrame: number;
    const updateVolume = () => {
      if (isConnected) {
        // Placeholder for visualizer logic
      }
      animationFrame = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrame);
  }, [isConnected]);

  return { connect, disconnect, isConnected, isConnecting, error };
};


import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audio';
import { LIVE_MODEL } from '../constants';
import { Score } from '../types';

interface UseLiveSessionProps {
  systemInstruction: string;
  voiceName: string;
  onVolumeChange: (vol: number) => void;
  onScoreUpdate?: (score: Score) => void;
}

const updateScoreTool: FunctionDeclaration = {
  name: 'updateScore',
  description: 'Update the visual game score when points are awarded.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      playerScore: {
        type: Type.NUMBER,
        description: 'The current total score of the human player.',
      },
      aiScore: {
        type: Type.NUMBER,
        description: 'The current total score of the AI host.',
      },
    },
    required: ['playerScore', 'aiScore'],
  },
};

export const useLiveSession = ({ systemInstruction, voiceName, onVolumeChange, onScoreUpdate }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    sessionPromiseRef.current = null;

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    onVolumeChange(0);
  }, [onVolumeChange]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

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
            setIsConnecting(false);

            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               
               if (sessionPromiseRef.current) {
                 sessionPromiseRef.current.then(session => {
                   session.sendRealtimeInput({ media: pcmBlob });
                 });
               }
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls (Scoring)
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateScore') {
                  const newScore = { 
                    player: fc.args['playerScore'] as number, 
                    ai: fc.args['aiScore'] as number 
                  };
                  
                  if (onScoreUpdate) {
                    onScoreUpdate(newScore);
                  }

                  // Send response back to model
                  if (sessionPromiseRef.current) {
                     sessionPromiseRef.current.then(session => {
                       session.sendToolResponse({
                         functionResponses: {
                           id: fc.id,
                           name: fc.name,
                           response: { result: "Score updated successfully." }
                         }
                       });
                     });
                  }
                }
              }
            }

            // Handle Audio
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                24000,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);

              const now = ctx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
              };
            }
            
            if (msg.serverContent?.interrupted) {
               console.log("Interrupted");
               sourcesRef.current.forEach(s => s.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Session closed');
            disconnect();
          },
          onerror: (err) => {
            console.error('Session error', err);
            setError(JSON.stringify(err));
            disconnect();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
      const session = await sessionPromise;
      sessionRef.current = session;

    } catch (e: any) {
      console.error("Connection failed", e);
      setError(e.message || "Failed to connect");
      setIsConnecting(false);
      disconnect();
    }
  }, [systemInstruction, voiceName, isConnecting, isConnected, disconnect, onScoreUpdate]);

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

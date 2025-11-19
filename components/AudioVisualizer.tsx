import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  active: boolean;
  color?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ active, color = 'bg-blue-500' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const barCount = 64; // Higher resolution
    const bars: number[] = Array(barCount).fill(0);
    
    // Helper to extract hex color from Tailwind class
    const getMainColor = (c: string) => {
      if (c.includes('red')) return '#ef4444';
      if (c.includes('green')) return '#10b981';
      if (c.includes('purple')) return '#a855f7';
      if (c.includes('orange')) return '#f97316';
      if (c.includes('pink')) return '#ec4899';
      if (c.includes('cyan')) return '#06b6d4';
      return '#3b82f6';
    };
    const mainColor = getMainColor(color);

    const render = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      const barWidth = (width / barCount) - 2;
      const totalBarWidth = barCount * (barWidth + 2);
      const startX = (width - totalBarWidth) / 2;
      const center = barCount / 2;

      ctx.clearRect(0, 0, width, height);

      // Animation Physics
      const t = time * 0.0015;
      
      // 1. Breathing Effect (Idle State)
      // A subtle, rhythmic pulse that mimics a heartbeat or gentle breathing
      const breathing = (Math.sin(t * 2) * 0.5 + 0.5) * 0.1;

      // 2. Speech Simulation (Active State)
      // Uses multiple sine waves with prime periods to create non-repeating "speech-like" patterns
      const voiceCarrier = Math.sin(t * 8) * Math.cos(t * 3.7) * Math.sin(t * 1.5);
      const speechIntensity = Math.max(0, voiceCarrier) * 0.8;
      
      // Simulate conversation flow (talking vs listening pauses)
      const conversationFlow = Math.sin(t * 0.4) + Math.sin(t * 0.7);
      const isSpeaking = conversationFlow > -0.2; // Speaking about 60% of time when active

      // Determine global amplitude
      const amplitude = active 
        ? (isSpeaking ? Math.max(breathing, speechIntensity) : breathing) 
        : 0.02;

      bars.forEach((currentH, i) => {
        const dist = Math.abs(i - center);
        const normalizedDist = dist / center;
        
        // Bell curve shape for the visualizer
        const shape = Math.exp(-Math.pow(normalizedDist / 0.5, 2));
        
        let targetH = 0;

        if (active) {
            // Frequency simulation
            // High frequencies (edges) jitter faster
            const freq = (i % 2 === 0 ? 1 : 0.5) * Math.sin(t * (10 + dist));
            
            // Add noise
            const noise = Math.random() * 0.1;
            
            // Main height calculation
            // Base breathing + Dynamic Speech + Frequency Details
            let h = (amplitude * shape * height * 0.6);
            
            // Add "texture" to the sound
            if (amplitude > 0.2) {
                h += h * freq * 0.3;
                h += height * noise * 0.1;
            }
            
            // Minimum height for "breathing" look
            const minBreath = height * 0.05 * shape * (Math.sin(t * 3 + i * 0.2) * 0.5 + 1);
            targetH = Math.max(h, minBreath);

        } else {
            targetH = 2;
        }

        // Elastic interpolation for organic movement
        const ease = 0.2;
        const newH = currentH + (targetH - currentH) * ease;
        bars[i] = newH;

        const x = startX + i * (barWidth + 2);
        const y = (height - newH) / 2;

        // Dynamic styling
        if (active) {
             // Glow increases with amplitude
             const glowStr = Math.min(newH / (height * 0.5), 1) * 20;
             ctx.shadowBlur = 5 + glowStr;
             ctx.shadowColor = mainColor;
        } else {
             ctx.shadowBlur = 0;
        }

        const gradient = ctx.createLinearGradient(x, y, x, y + newH);
        gradient.addColorStop(0, '#ffffff'); // Hot white top
        gradient.addColorStop(0.4, mainColor); // Body color
        gradient.addColorStop(1, `${mainColor}00`); // Fade out

        ctx.fillStyle = gradient;
        
        // Draw rounded bars
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, Math.max(2, newH), 4);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, barWidth, Math.max(2, newH));
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => cancelAnimationFrame(animationId);
  }, [active, color]);

  return (
    <div className="w-full h-full transition-transform duration-700 ease-out hover:scale-105 cursor-pointer">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default AudioVisualizer;
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
    let bars: number[] = Array(20).fill(10); // Initial height

    const render = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bars.length) - 4;

      // Update bars
      bars = bars.map(h => {
        if (!active) return Math.max(5, h * 0.9); // Decay to silence
        // Random movement for simulation if no real analyser data passed
        const target = Math.random() * (height * 0.8); 
        return h + (target - h) * 0.2; 
      });

      // Draw
      bars.forEach((barHeight, i) => {
        const x = i * (barWidth + 4) + 2;
        const y = (height - barHeight) / 2;
        
        // Create gradient based on input color class is tricky in canvas, using hex maps or computed style
        // We will hardcode a nice gradient logic or use the color prop if we parsed it, 
        // but for simplicity let's use a vibrant gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#60a5fa'); // blue-400
        gradient.addColorStop(1, '#3b82f6'); // blue-500
        
        // Adjust color based on prop roughly
        if (color.includes('red')) {
             gradient.addColorStop(0, '#f87171'); 
             gradient.addColorStop(1, '#ef4444');
        } else if (color.includes('green')) {
             gradient.addColorStop(0, '#4ade80'); 
             gradient.addColorStop(1, '#22c55e');
        } else if (color.includes('purple')) {
             gradient.addColorStop(0, '#c084fc'); 
             gradient.addColorStop(1, '#a855f7');
        }

        ctx.fillStyle = gradient;
        
        // Rounded caps
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 5);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [active, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full max-w-md h-24 opacity-90"
    />
  );
};

export default AudioVisualizer;

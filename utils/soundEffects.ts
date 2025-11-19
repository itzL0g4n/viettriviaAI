
// Singleton AudioContext to prevent browser limits
let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

type SoundType = 'click' | 'tick' | 'open' | 'close' | 'start' | 'cancel' | 'select' | 'hover' | 'success' | 'error' | 'victory' | 'defeat';

export const playUiSound = (type: SoundType) => {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'click':
        // Crisp, high-pitched glass tap
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'select':
        // Pleasant confirmation tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'tick':
        // Very short, subtle tick for sliders
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
        break;

      case 'open':
        // Ascending glass swell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'close':
      case 'cancel':
        // Descending glass fade
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'start':
        // Major Chord Arpeggio (C E G) - Futuristic Start
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.connect(g);
            g.connect(ctx.destination);
            
            const startTime = now + (i * 0.1);
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.01, startTime + 1.5);
            
            o.start(startTime);
            o.stop(startTime + 1.5);
        });
        break;
        
      case 'hover':
        // Extremely subtle high freq ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'success':
        // Bright, happy major third chime
        const sNotes = [523.25, 659.25]; // C5, E5
        sNotes.forEach((freq, i) => {
           const o = ctx.createOscillator();
           const g = ctx.createGain();
           o.type = 'triangle';
           o.frequency.value = freq;
           g.gain.setValueAtTime(0, now);
           g.gain.linearRampToValueAtTime(0.1, now + 0.05);
           g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
           o.connect(g);
           g.connect(ctx.destination);
           o.start(now + i * 0.1);
           o.stop(now + 0.5);
        });
        break;

      case 'error':
        // Low dissonant thud
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      
      case 'victory':
        // Grand arpeggio ascending
        const vNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C Major
        vNotes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.value = freq;
            
            const startTime = now + (i * 0.15);
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, startTime + 2);
            
            o.connect(g);
            g.connect(ctx.destination);
            o.start(startTime);
            o.stop(startTime + 2);
        });
        break;
        
      case 'defeat':
        // Slow descending minor triad
        const dNotes = [440.00, 349.23, 293.66]; // A Minor (A, F, D)ish
        dNotes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.value = freq;
            
            const startTime = now + (i * 0.3);
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, startTime + 2);
            
            o.connect(g);
            g.connect(ctx.destination);
            o.start(startTime);
            o.stop(startTime + 2);
        });
        break;
    }
  } catch (e) {
    // Ignore audio context errors (e.g. if not supported)
  }
};
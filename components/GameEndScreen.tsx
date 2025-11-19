
import React, { useEffect } from 'react';
import { Trophy, RotateCcw, Home, Frown, Crown } from 'lucide-react';
import { Score } from '../types';
import { playUiSound } from '../utils/soundEffects';

interface GameEndScreenProps {
  winner: 'player' | 'ai';
  score: Score;
  onPlayAgain: () => void;
  onExit: () => void;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ winner, score, onPlayAgain, onExit }) => {
  const isPlayerWin = winner === 'player';

  useEffect(() => {
    // We play the sound in the parent component upon state change to ensure sync
    // but we can trigger visual effects here
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg p-8 rounded-[3rem] overflow-hidden flex flex-col items-center text-center shadow-2xl animate-scale-in border border-white/10 bg-[#1e293b]">
        
        {/* Dynamic Background */}
        <div className={`absolute inset-0 opacity-30 bg-gradient-to-br ${isPlayerWin ? 'from-yellow-500 via-orange-500 to-red-500' : 'from-gray-700 via-gray-800 to-black'}`}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
        
        {/* Confetti / Gloom Effect */}
        {isPlayerWin && (
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-blob opacity-80"></div>
             <div className="absolute top-10 right-1/4 w-3 h-3 bg-red-400 rounded-full animate-blob animation-delay-2000 opacity-80"></div>
             <div className="absolute bottom-20 left-1/2 w-4 h-4 bg-blue-400 rounded-full animate-blob animation-delay-4000 opacity-80"></div>
          </div>
        )}

        {/* Icon */}
        <div className="relative z-10 mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${isPlayerWin ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : 'bg-gray-500/20 border-gray-500 text-gray-400 shadow-[0_0_30px_rgba(107,114,128,0.5)]'}`}>
             {isPlayerWin ? <Crown className="w-12 h-12" /> : <Frown className="w-12 h-12" />}
          </div>
        </div>

        {/* Text */}
        <div className="relative z-10 space-y-2 mb-8">
          <h2 className={`text-4xl font-black uppercase tracking-wider ${isPlayerWin ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm' : 'text-gray-300'}`}>
            {isPlayerWin ? 'Victory!' : 'Game Over'}
          </h2>
          <p className="text-white/60 font-medium text-lg">
            {isPlayerWin 
              ? 'You have proven your knowledge supreme!' 
              : 'The AI has outsmarted you this time.'}
          </p>
        </div>

        {/* Final Score Display */}
        <div className="relative z-10 w-full bg-black/20 rounded-2xl p-4 mb-8 border border-white/5 flex justify-around items-center">
           <div className="flex flex-col items-center">
             <span className="text-xs font-bold text-white/40 uppercase">You</span>
             <span className={`text-3xl font-bold ${isPlayerWin ? 'text-green-400' : 'text-white/70'}`}>{score.player}</span>
           </div>
           <div className="h-8 w-px bg-white/10"></div>
           <div className="flex flex-col items-center">
             <span className="text-xs font-bold text-white/40 uppercase">AI Host</span>
             <span className={`text-3xl font-bold ${!isPlayerWin ? 'text-red-400' : 'text-white/70'}`}>{score.ai}</span>
           </div>
        </div>

        {/* Buttons */}
        <div className="relative z-10 w-full space-y-3">
          <button 
            onClick={() => { playUiSound('click'); onPlayAgain(); }}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2
              ${isPlayerWin 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-600 shadow-orange-500/30' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30'}
            `}
          >
            <RotateCcw className="w-5 h-5" /> Play Again
          </button>

          <button 
            onClick={() => { playUiSound('cancel'); onExit(); }}
            className="w-full py-4 rounded-xl font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Return to Menu
          </button>
        </div>

      </div>
    </div>
  );
};

export default GameEndScreen;


import React from 'react';
import { Trophy, Bot, User } from 'lucide-react';
import { Score } from '../types';

interface ScoreBoardProps {
  score: Score;
  winningScore: number;
  activeColor: string;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, winningScore, activeColor }) => {
  // Calculate progress percentages
  const playerProgress = Math.min(100, (score.player / winningScore) * 100);
  const aiProgress = Math.min(100, (score.ai / winningScore) * 100);

  return (
    <div className="w-full max-w-md mx-auto mb-6 animate-fade-in">
      <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-xl overflow-hidden">
        
        {/* Decorative shine */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

        <div className="flex justify-between items-center gap-8 relative z-10">
          
          {/* Player Side */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-widest">
              <User className="w-4 h-4" /> You
            </div>
            <div className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300 transform">
              {score.player}
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out"
                style={{ width: `${playerProgress}%` }}
              ></div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-px h-8 bg-white/10 mb-1"></div>
            <Trophy className="w-4 h-4 text-yellow-400 opacity-50" />
            <div className="text-[10px] text-white/30 font-mono mt-1">To {winningScore}</div>
            <div className="w-px h-8 bg-white/10 mt-1"></div>
          </div>

          {/* AI Side */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-widest">
              Host <Bot className="w-4 h-4" />
            </div>
            <div className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-300 transform">
              {score.ai}
            </div>
             <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${activeColor.replace('bg-', 'bg-')} shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-500 ease-out`}
                style={{ width: `${aiProgress}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;

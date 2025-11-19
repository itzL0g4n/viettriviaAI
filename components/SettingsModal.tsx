
import React from 'react';
import { X, Trophy, Clock, Zap, Settings } from 'lucide-react';
import { GameSettings } from '../types';
import { playUiSound } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdate: (newSettings: GameSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  const handleDifficultyChange = (level: GameSettings['difficulty']) => {
    playUiSound('click');
    onUpdate({ ...settings, difficulty: level });
  };

  const handleScoreChange = (delta: number) => {
    playUiSound('click');
    onUpdate({ ...settings, winningScore: Math.max(3, Math.min(20, settings.winningScore + delta)) });
  };

  const handleDurationChange = (val: number) => {
    playUiSound('tick');
    onUpdate({ ...settings, roundDuration: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#1e293b]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden text-white animate-scale-in transform transition-all duration-300 scale-100 opacity-100 ring-1 ring-white/20 max-h-[85vh] flex flex-col">
        
        {/* Glass Shine Effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0"></div>

        {/* Header */}
        <div className="relative z-10 px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 flex-none">
          <h2 className="text-xl font-bold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            <Settings className="w-5 h-5 text-blue-400" /> 
            Game Configuration
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="relative z-10 p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Difficulty Section */}
          <div>
            <label className="text-sm font-medium text-blue-200 mb-3 flex items-center gap-2 uppercase tracking-wider opacity-80">
              <Zap className="w-4 h-4" /> Difficulty
            </label>
            <div className="flex p-1.5 bg-black/20 rounded-2xl border border-white/5 backdrop-blur-md">
              {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden ${
                    settings.difficulty === level 
                      ? 'text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {settings.difficulty === level && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-indigo-600/80 backdrop-blur-sm"></div>
                  )}
                  <span className="relative z-10">{level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Round Duration Section */}
          <div>
            <div className="flex justify-between mb-3">
              <label className="text-sm font-medium text-blue-200 flex items-center gap-2 uppercase tracking-wider opacity-80">
                <Clock className="w-4 h-4" /> Round Duration
              </label>
              <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                {settings.roundDuration}s
              </span>
            </div>
            <div className="relative h-8 flex items-center">
               <input
                type="range"
                min="30"
                max="120"
                step="10"
                value={settings.roundDuration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                className="w-full h-2 bg-black/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>
          </div>

          {/* Winning Score Section */}
          <div>
             <div className="flex justify-between mb-3">
              <label className="text-sm font-medium text-blue-200 flex items-center gap-2 uppercase tracking-wider opacity-80">
                <Trophy className="w-4 h-4" /> Winning Score
              </label>
              <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                {settings.winningScore} pts
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 bg-black/20 rounded-2xl border border-white/5">
               <span className="text-xs text-white/40">First to reach...</span>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => handleScoreChange(-1)}
                   className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-lg border border-white/10 transition-colors"
                 >
                   -
                 </button>
                 <div className="w-8 text-center font-bold text-lg">{settings.winningScore}</div>
                 <button 
                   onClick={() => handleScoreChange(1)}
                   className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-lg border border-white/10 transition-colors"
                 >
                   +
                 </button>
               </div>
            </div>
          </div>

        </div>

        {/* Footer - Fixed at bottom */}
        <div className="relative z-10 p-8 pt-4 flex-none border-t border-white/5">
          <button 
            onClick={() => { playUiSound('click'); onClose(); }}
            className="w-full py-4 rounded-2xl font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:scale-[1.02] transition-all border border-white/10 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-xl"></div>
            <span className="relative">Apply Configuration</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;

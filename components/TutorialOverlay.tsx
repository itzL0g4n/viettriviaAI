
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Mic, Users, Trophy, Settings2, Sparkles } from 'lucide-react';
import { playUiSound } from '../utils/soundEffects';

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to Viet Trivia AI",
    description: "Experience a fully voice-interactive trivia game. No typing required—just listen to your AI host and speak your answers naturally!",
    icon: <Sparkles className="w-16 h-16 text-yellow-300" />,
    gradient: "from-yellow-400/20 via-orange-500/20 to-red-500/20",
    accent: "bg-yellow-500"
  },
  {
    title: "Meet Your Hosts",
    description: "Choose a personality that fits your mood. From a supportive teacher to a witty, sarcastic comedian, each host has a unique voice and style.",
    icon: <Users className="w-16 h-16 text-blue-300" />,
    gradient: "from-blue-400/20 via-indigo-500/20 to-purple-500/20",
    accent: "bg-blue-500"
  },
  {
    title: "How to Play",
    description: "Once the session starts, the host will ask questions. Wait for them to finish, then speak your answer clearly. The AI listens in real-time!",
    icon: <Mic className="w-16 h-16 text-green-300" />,
    gradient: "from-green-400/20 via-emerald-500/20 to-teal-500/20",
    accent: "bg-green-500"
  },
  {
    title: "Game Settings",
    description: "Before you start, check the Settings menu to adjust the difficulty level, round duration, and the score needed to win.",
    icon: <Settings2 className="w-16 h-16 text-purple-300" />,
    gradient: "from-purple-400/20 via-pink-500/20 to-rose-500/20",
    accent: "bg-purple-500"
  }
];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    playUiSound('click');
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    playUiSound('click');
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-fade-in" 
        onClick={onClose} // Optional: allow closing by clicking outside
      ></div>

      {/* Card */}
      <div className="relative w-full max-w-lg bg-[#1e293b]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col min-h-[500px]">
        
        {/* Dynamic Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} transition-all duration-700 opacity-50`}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

        {/* Top Right Close Button */}
        <button 
          onClick={() => { playUiSound('click'); onClose(); }}
          className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white/50 hover:text-white transition-colors backdrop-blur-md border border-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8">
          
          {/* Icon Container */}
          <div className="relative group">
             <div className={`absolute inset-0 ${step.accent} blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500`}></div>
             <div className="relative w-32 h-32 rounded-3xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                {step.icon}
             </div>
          </div>

          {/* Text */}
          <div className="space-y-4 max-w-sm mx-auto">
             <h2 className="text-3xl font-bold text-white drop-shadow-md">{step.title}</h2>
             <p className="text-lg text-white/70 font-light leading-relaxed">
               {step.description}
             </p>
          </div>

        </div>

        {/* Navigation Footer */}
        <div className="relative z-10 p-8 border-t border-white/5 bg-black/10 backdrop-blur-md flex items-center justify-between">
          
          {/* Progress Dots */}
          <div className="flex gap-2">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? `w-8 ${step.accent}` : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button 
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`p-3 rounded-full border border-white/10 transition-all ${
                currentStep === 0 
                  ? 'opacity-0 pointer-events-none' 
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleNext}
              className={`
                px-6 py-3 rounded-full font-bold text-white shadow-lg flex items-center gap-2 transition-all hover:scale-105
                ${currentStep === STEPS.length - 1 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30' 
                  : 'bg-white/10 hover:bg-white/20 border border-white/10'}
              `}
            >
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TutorialOverlay;

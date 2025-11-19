import React, { useState, useEffect } from 'react';
import { AppState, Personality, SearchResult } from './types';
import { PERSONALITIES } from './constants';
import { fetchDailyTriviaFact, playTextToSpeech } from './services/geminiService';
import { useLiveSession } from './hooks/useLiveSession';
import AudioVisualizer from './components/AudioVisualizer';
import { Mic, MicOff, Sparkles, Info, Volume2, Radio, Globe, PlayCircle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);
  const [dailyFact, setDailyFact] = useState<SearchResult | null>(null);
  const [factLoading, setFactLoading] = useState(false);
  
  // Live Session Hook
  const { connect, disconnect, isConnected, isConnecting, error } = useLiveSession({
    systemInstruction: `${selectedPersonality.systemInstruction} The game MUST be played in Vietnamese language.`,
    voiceName: selectedPersonality.voiceName,
    onVolumeChange: () => {}, // Not utilized in this simplified visualizer version
  });

  // Fetch trivia fact on mount
  useEffect(() => {
    const loadFact = async () => {
      setFactLoading(true);
      const fact = await fetchDailyTriviaFact();
      setDailyFact(fact);
      setFactLoading(false);
    };
    loadFact();
  }, []);

  const handlePersonalitySelect = (p: Personality) => {
    setSelectedPersonality(p);
    // Optional: Preview voice using TTS
    playTextToSpeech(`Xin chào, tôi là ${p.name}`, p.voiceName);
  };

  const handleStartGame = () => {
    setAppState(AppState.GAME);
    // Auto-connect after a short delay to ensure transition is smooth
    setTimeout(() => {
       connect();
    }, 500);
  };

  const handleEndGame = () => {
    disconnect();
    setAppState(AppState.SETUP);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header */}
      <header className="p-6 border-b border-gray-800 flex justify-between items-center backdrop-blur-sm bg-gray-900/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Viet Trivia AI</h1>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Powered by Gemini Live
            </div>
          </div>
        </div>
        {appState === AppState.GAME && (
           <button 
             onClick={handleEndGame}
             className="px-4 py-2 rounded-full text-sm font-medium bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 text-gray-300"
           >
             End Session
           </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-4 md:p-8 max-w-5xl mx-auto w-full">
        
        {appState === AppState.SETUP && (
          <div className="w-full space-y-8 animate-fade-in">
            
            {/* Grounding Section */}
            <section className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Globe className="w-5 h-5" />
                <h2 className="text-lg font-semibold uppercase tracking-wider text-sm">Daily Trivia Insight</h2>
              </div>
              {factLoading ? (
                <div className="flex items-center gap-3 text-gray-400 h-20">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching latest facts...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-lg text-gray-200 leading-relaxed">{dailyFact?.text}</p>
                  {dailyFact?.sources && dailyFact.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dailyFact.sources.map((s, i) => (
                        <a 
                          key={i} 
                          href={s.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-gray-900/80 hover:bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full transition-colors border border-gray-700 hover:border-blue-700 flex items-center gap-1"
                        >
                          <Info className="w-3 h-3" />
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Personality Selector */}
            <section>
               <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Host</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {PERSONALITIES.map(p => (
                   <div 
                     key={p.id}
                     onClick={() => handlePersonalitySelect(p)}
                     className={`
                       relative group cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 transform hover:-translate-y-1
                       ${selectedPersonality.id === p.id 
                         ? `border-${p.color.replace('bg-', '')} bg-gray-800 shadow-xl` 
                         : 'border-gray-800 bg-gray-900 hover:border-gray-700'}
                     `}
                   >
                      <div className={`
                        absolute top-4 right-4 w-3 h-3 rounded-full 
                        ${selectedPersonality.id === p.id ? p.color : 'bg-gray-700'}
                      `}></div>
                      
                      <div className={`w-12 h-12 rounded-xl ${p.color} flex items-center justify-center mb-4 text-white shadow-lg`}>
                        <Sparkles className="w-6 h-6" />
                      </div>
                      
                      <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                      <p className="text-gray-400 text-sm mb-4 h-10">{p.description}</p>
                      
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 group-hover:text-gray-300">
                        <Volume2 className="w-4 h-4" />
                        Voice: {p.voiceName}
                      </div>
                   </div>
                 ))}
               </div>
            </section>

            {/* Start Button */}
            <div className="flex justify-center pt-8">
              <button
                onClick={handleStartGame}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-lg rounded-full hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/40 focus:outline-none ring-offset-2 focus:ring-2 ring-blue-400"
              >
                <span className="mr-2">Start Game</span>
                <PlayCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        )}

        {appState === AppState.GAME && (
          <div className="w-full max-w-2xl flex flex-col items-center justify-center h-[70vh] space-y-12 animate-fade-in">
            
            {/* Host Avatar / Visual */}
            <div className="relative">
               <div className={`absolute -inset-4 rounded-full blur-xl opacity-30 animate-pulse ${selectedPersonality.color}`}></div>
               <div className="relative w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className={`w-full h-full opacity-80 mix-blend-overlay ${selectedPersonality.color}`}></div>
                  <span className="absolute text-4xl font-bold z-10 opacity-90">{selectedPersonality.name.charAt(0)}</span>
               </div>
               <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white" />
               </div>
            </div>

            {/* Status & Error */}
            <div className="text-center space-y-2">
               <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                 {selectedPersonality.name}
               </h2>
               <p className="text-blue-400 font-medium animate-pulse">
                 {isConnecting ? 'Connecting to Studio...' : isConnected ? 'Listening...' : 'Disconnected'}
               </p>
               {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}
            </div>

            {/* Visualizer */}
            <div className="w-full bg-gray-800/50 rounded-3xl p-8 backdrop-blur-sm border border-gray-700/50 shadow-2xl flex justify-center items-center min-h-[160px]">
               {isConnected ? (
                 <AudioVisualizer active={true} color={selectedPersonality.color} />
               ) : (
                 <div className="text-gray-500 flex items-center gap-2">
                   <Loader2 className={`w-6 h-6 ${isConnecting ? 'animate-spin' : ''}`} />
                   <span>Waiting for audio stream...</span>
                 </div>
               )}
            </div>

            {/* Controls */}
            <div className="flex gap-6">
               {!isConnected && !isConnecting && (
                 <button 
                   onClick={connect}
                   className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-all shadow-lg hover:scale-105"
                 >
                   <Mic className="w-8 h-8" />
                 </button>
               )}
               
               {isConnected && (
                 <button 
                   onClick={disconnect}
                   className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg hover:scale-105"
                 >
                   <MicOff className="w-8 h-8" />
                 </button>
               )}
            </div>
            
            <p className="text-gray-500 text-sm mt-8 max-w-md text-center">
              Tip: Use headphones for the best experience. Speak clearly after the host finishes talking.
            </p>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { AppState, Personality, SearchResult, GameSettings, Score } from './types';
import { PERSONALITIES } from './constants';
import { fetchDailyTriviaFact, playTextToSpeech } from './services/geminiService';
import { useLiveSession } from './hooks/useLiveSession';
import { playUiSound } from './utils/soundEffects';
import AudioVisualizer from './components/AudioVisualizer';
import SettingsModal from './components/SettingsModal';
import TutorialOverlay from './components/TutorialOverlay';
import ScoreBoard from './components/ScoreBoard';
import GameEndScreen from './components/GameEndScreen';
import { Mic, MicOff, Sparkles, Info, Volume2, Radio, Globe, PlayCircle, Loader2, Disc, Settings, CircleHelp } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);
  const [dailyFact, setDailyFact] = useState<SearchResult | null>(null);
  const [factLoading, setFactLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  
  // Game Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    difficulty: 'Medium',
    roundDuration: 60,
    winningScore: 5,
  });

  // Score State
  const [score, setScore] = useState<Score>({ player: 0, ai: 0 });
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);

  // Tutorial State
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Check for first-time visitor
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('viet_trivia_tutorial_seen');
    if (!hasSeenTutorial) {
      setIsTutorialOpen(true);
    }
  }, []);

  const openTutorial = () => {
    playUiSound('open');
    setIsTutorialOpen(true);
  };

  const closeTutorial = () => {
    playUiSound('close');
    setIsTutorialOpen(false);
    localStorage.setItem('viet_trivia_tutorial_seen', 'true');
  };

  const openSettings = () => {
    playUiSound('open');
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    playUiSound('close');
    setIsSettingsOpen(false);
  };

  const handleScoreUpdate = (newScore: Score) => {
    // Only process score updates if game is in progress
    if (appState !== AppState.GAME) return;

    // Check for win condition
    if (newScore.player >= gameSettings.winningScore) {
      setScore(newScore);
      setWinner('player');
      setAppState(AppState.FINISHED);
      playUiSound('victory');
    } else if (newScore.ai >= gameSettings.winningScore) {
      setScore(newScore);
      setWinner('ai');
      setAppState(AppState.FINISHED);
      playUiSound('defeat');
    } else {
      // Normal score update
      if (newScore.player > score.player) {
        playUiSound('success');
      } else if (newScore.ai > score.ai) {
        playUiSound('error');
      }
      setScore(newScore);
    }
  };
  
  const getSystemInstruction = () => {
    let instruction = selectedPersonality.systemInstruction;
    
    // Add Easy mode specific instruction
    if (gameSettings.difficulty === 'Easy') {
      instruction += "\n\nIMPORTANT - EASY MODE ACTIVE: Speak about 20% slower than normal. Articulate every word very clearly. Leave longer pauses (1-2 seconds) between sentences to ensure the user has time to process.";
    }

    instruction += `
    The game MUST be played in Vietnamese language.
    
    GAME CONFIGURATION:
    - Difficulty Level: ${gameSettings.difficulty}
    - Round/Question Duration: Keep pacing around ${gameSettings.roundDuration} seconds.
    - Winning Score: ${gameSettings.winningScore}.
    
    SCORING RULES:
    - You are responsible for keeping track of the score.
    - If the user answers correctly, they get 1 point.
    - If the user answers incorrectly or passes, you (the host) get 1 point.
    - You MUST use the provided 'updateScore' tool IMMEDIATELY whenever points are awarded to update the visual scoreboard.
    - Do not just say the score; call the function.
    
    When a user reaches ${gameSettings.winningScore} points, celebrate wildly and declare them the winner!
    When you (the host) reach ${gameSettings.winningScore} points, playfully declare yourself the winner.`;
    
    return instruction;
  };

  // Live Session Hook
  const { connect, disconnect, isConnected, isConnecting, error } = useLiveSession({
    systemInstruction: getSystemInstruction(),
    voiceName: selectedPersonality.voiceName,
    onVolumeChange: () => {},
    onScoreUpdate: handleScoreUpdate,
  });

  // Connection Loading Messages Effect
  useEffect(() => {
    if (isConnecting) {
      const messages = [
        "Establishing secure channel...",
        "Warming up voice synthesis...",
        "Loading trivia database...",
        "Calibrating humor levels...",
        "Connecting to host...",
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 1500);
      
      return () => clearInterval(interval);
    }
  }, [isConnecting]);

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
    playUiSound('select');
    setSelectedPersonality(p);
    playTextToSpeech(`Xin chào, tôi là ${p.name}`, p.voiceName);
  };

  const handleStartGame = () => {
    playUiSound('start');
    setScore({ player: 0, ai: 0 });
    setWinner(null);
    setAppState(AppState.GAME);
    // Slight delay to allow UI transition before connecting
    setTimeout(() => {
       connect();
    }, 500);
  };

  const handlePlayAgain = () => {
    // Disconnect current session, reset score, and restart
    disconnect();
    handleStartGame();
  };

  const handleReturnToMenu = () => {
    disconnect();
    setAppState(AppState.SETUP);
    setScore({ player: 0, ai: 0 });
    setWinner(null);
  };

  const handleEndGame = () => {
    playUiSound('cancel');
    disconnect();
    setAppState(AppState.SETUP);
  };

  const handleConnect = () => {
    playUiSound('click');
    connect();
  };

  const handleDisconnect = () => {
    playUiSound('click');
    disconnect();
  };

  // Helper to get color values for the blobs based on personality
  const getBlobColors = (colorClass: string) => {
    if (colorClass.includes('red')) return ['bg-red-500', 'bg-orange-500', 'bg-pink-500'];
    if (colorClass.includes('green')) return ['bg-green-500', 'bg-emerald-500', 'bg-teal-500'];
    if (colorClass.includes('purple')) return ['bg-purple-600', 'bg-indigo-600', 'bg-blue-600'];
    return ['bg-blue-500', 'bg-cyan-500', 'bg-indigo-500'];
  };

  const blobColors = getBlobColors(selectedPersonality.color);

  return (
    <div className="relative h-[100dvh] w-full flex flex-col bg-[#0f172a] text-white selection:bg-white/30 overflow-hidden font-sans">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={closeSettings} 
        settings={gameSettings}
        onUpdate={setGameSettings}
      />

      <TutorialOverlay 
        isOpen={isTutorialOpen}
        onClose={closeTutorial}
      />

      {/* Fixed Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-0 -left-4 w-96 h-96 ${blobColors[0]} rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob`}></div>
        <div className={`absolute top-0 -right-4 w-96 h-96 ${blobColors[1]} rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-2000`}></div>
        <div className={`absolute -bottom-8 left-20 w-96 h-96 ${blobColors[2]} rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000`}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Top Header - Non-scrolling */}
      <header className="relative z-20 flex-none pt-4 pb-2 px-4 flex justify-center">
        <div className="w-full max-w-3xl px-2 py-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-3 shadow-2xl shadow-black/10 pr-4 justify-between sm:justify-start">
          <div className="flex items-center gap-3 pl-2">
            <div className="p-2 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full shadow-lg">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 sm:block">
                Viet Trivia AI
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
             
             {/* Help Button */}
             <button 
               onClick={openTutorial}
               onMouseEnter={() => playUiSound('hover')}
               className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
               title="Help & Tutorial"
             >
               <CircleHelp className="w-5 h-5" />
             </button>

             {/* Settings Button */}
             <button 
               onClick={openSettings}
               onMouseEnter={() => playUiSound('hover')}
               className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
               title="Game Settings"
             >
               <Settings className="w-5 h-5" />
             </button>

             <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

             <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-white/60">
               <span className={`relative flex h-2 w-2`}>
                 {(isConnected || isConnecting) && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnecting ? 'bg-blue-400' : 'bg-green-400'}`}></span>}
                 <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-blue-500' : 'bg-white/30'}`}></span>
               </span>
               <span>{isConnected ? 'Live' : isConnecting ? 'Connecting...' : 'Ready'}</span>
             </div>
          </div>

          {(appState === AppState.GAME || appState === AppState.FINISHED) && (
             <button 
               onClick={handleEndGame}
               onMouseEnter={() => playUiSound('hover')}
               className="ml-auto sm:ml-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all border border-white/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] whitespace-nowrap"
             >
               End Game
             </button>
          )}
        </div>
      </header>

      {/* Main Scrollable Content Area */}
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4 scrollbar-hide">
        <div className="w-full max-w-7xl mx-auto min-h-full flex flex-col">
          
          {appState === AppState.SETUP && (
            <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
              
              {/* Left Col: Info & Fact */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                 {/* Daily Insight Card */}
                 <div className="group relative p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-lg overflow-hidden hover:bg-white/10 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30">
                        <Globe className="w-4 h-4" />
                      </div>
                      <h2 className="text-base font-semibold tracking-wide text-white/90">Daily Insight</h2>
                    </div>

                    {factLoading ? (
                      <div className="flex items-center justify-center h-20 gap-3 text-white/40">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-xs">Fetching data...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-base font-light leading-relaxed text-white/80">
                          {dailyFact?.text}
                        </p>
                        {dailyFact?.sources && dailyFact.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                            {dailyFact.sources.slice(0,2).map((s, i) => (
                              <a 
                                key={i} 
                                href={s.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] uppercase tracking-wider font-semibold bg-black/20 hover:bg-black/40 text-white/60 px-2 py-1 rounded transition-colors truncate max-w-[150px]"
                              >
                                Source {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                 </div>

                 {/* Ready to Play Card - Desktop Only visual cue (Sticky on sidebar) */}
                 <div className="hidden lg:flex p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl flex-col items-center text-center shadow-xl relative overflow-hidden group transition-all">
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${selectedPersonality.color}`}></div>
                    <div className={`w-16 h-16 mb-4 rounded-2xl flex items-center justify-center ${selectedPersonality.color} text-white font-bold text-2xl shadow-lg`}>
                      {selectedPersonality.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Selected Host</h3>
                    <p className="text-xl font-medium text-blue-300 mb-6">{selectedPersonality.name}</p>
                    <button
                      onClick={handleStartGame}
                      className="w-full py-3 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/40 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Start Game
                    </button>
                 </div>
              </div>

              {/* Right Col: Personalities */}
              <div className="lg:col-span-8 flex flex-col">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-yellow-400" /> Choose Your Host
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                   {PERSONALITIES.map(p => {
                     const isSelected = selectedPersonality.id === p.id;
                     return (
                       <div 
                         key={p.id}
                         onClick={() => handlePersonalitySelect(p)}
                         onMouseEnter={() => playUiSound('hover')}
                         className={`
                           relative group cursor-pointer rounded-3xl p-5 transition-all duration-300
                           flex flex-col justify-between overflow-hidden border
                           ${isSelected 
                             ? 'bg-white/10 border-white/40 shadow-[0_0_20px_-5px_rgba(255,255,255,0.15)] ring-1 ring-white/20' 
                             : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 opacity-80 hover:opacity-100'}
                         `}
                       >
                          <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                          <div className="relative z-10 flex items-start justify-between mb-3">
                            <div className={`
                              w-12 h-12 rounded-xl flex items-center justify-center shadow-lg text-lg font-bold
                              ${isSelected ? `bg-gradient-to-br from-${p.color.replace('bg-', '')} to-gray-900` : 'bg-white/10'}
                            `}>
                               {p.name.charAt(0)}
                            </div>
                            {isSelected && <div className={`w-3 h-3 rounded-full ${p.color} shadow-[0_0_10px_currentColor]`}></div>}
                          </div>
                          
                          <div className="relative z-10 space-y-2">
                            <h3 className="text-lg font-bold text-white">{p.name}</h3>
                            <p className="text-xs text-white/60 leading-relaxed line-clamp-3 min-h-[3rem]">{p.description}</p>
                          </div>
                          
                          <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex items-center gap-1 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                            <Volume2 className="w-3 h-3" />
                            {p.voiceName}
                          </div>
                       </div>
                     );
                   })}
                </div>

                {/* Mobile/Tablet Floating Start Button (Bottom of Grid) */}
                <div className="lg:hidden sticky bottom-4 z-30 flex justify-center pb-4">
                  <button
                    onClick={handleStartGame}
                    className="w-full max-w-xs py-4 rounded-2xl font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] bg-[#0f172a] border border-white/20 relative overflow-hidden group animate-pulse hover:animate-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span>Start with {selectedPersonality.name}</span>
                      <PlayCircle className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>

            </div>
          )}

          {(appState === AppState.GAME || appState === AppState.FINISHED) && (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto animate-fade-in h-full min-h-[500px] gap-4 lg:gap-8">
              
              {/* Scoreboard - Top */}
              <div className="w-full flex-none">
                <ScoreBoard 
                  score={score} 
                  winningScore={gameSettings.winningScore} 
                  activeColor={selectedPersonality.color}
                />
              </div>

              {/* Central Hub - Flexible Center */}
              <div className="flex-1 w-full relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-between p-6 sm:p-10 overflow-hidden min-h-[300px]">
                
                {/* Decorative Internal Gradients */}
                <div className={`absolute top-[-20%] right-[-20%] w-[80%] h-[80%] ${blobColors[0]} rounded-full mix-blend-overlay filter blur-[80px] opacity-30 animate-blob`}></div>
                <div className={`absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] ${blobColors[1]} rounded-full mix-blend-overlay filter blur-[80px] opacity-30 animate-blob animation-delay-2000`}></div>

                {/* Header Info */}
                <div className="relative z-10 text-center space-y-2 flex-none">
                   <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-medium tracking-wider transition-all duration-300 ${
                     isConnecting 
                      ? 'bg-blue-500/20 border-blue-400/30 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                      : isConnected 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-white/5 border-white/10 text-white/60'
                   }`}>
                      {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Disc className={`w-3 h-3 ${isConnected ? 'animate-spin' : ''}`} />}
                      {isConnecting ? 'CONNECTING' : (isConnected ? 'LIVE SESSION' : 'READY')}
                   </div>
                   
                   <h2 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-lg">{selectedPersonality.name}</h2>
                   
                   <div className="h-6 flex items-center justify-center">
                      {isConnecting ? (
                         <p className="text-blue-200/80 font-medium text-xs sm:text-sm animate-pulse flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                           {loadingMessage}
                         </p>
                      ) : (
                         <p className="text-white/50 font-light text-xs sm:text-sm animate-fade-in text-center px-4">
                           {isConnected ? 'Listening for your answer...' : 'Tap microphone to start'}
                         </p>
                      )}
                   </div>
                </div>

                {/* Avatar / Visualizer Container - Flexible Space */}
                <div className="relative z-10 flex-1 flex items-center justify-center w-full py-4">
                   <div className="relative group">
                       {/* Glow Background */}
                       <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${
                         isConnecting ? 'opacity-40 scale-125 bg-blue-600' : `opacity-30 animate-pulse ${selectedPersonality.color}`
                       }`}></div>
                       
                       {/* Main Circle */}
                       <div className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden transition-all duration-500">
                          
                          {/* Connecting State Inner Visuals */}
                          {isConnecting ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent animate-pulse"></div>
                               <span className="relative z-10 text-4xl font-black text-blue-200 tracking-tighter animate-pulse">AI</span>
                            </div>
                          ) : (
                            <div className="text-6xl sm:text-7xl font-bold text-white/90 mix-blend-overlay transition-transform duration-500 group-hover:scale-110">
                              {selectedPersonality.name.charAt(0)}
                            </div>
                          )}
                       </div>

                       {/* Ring Spinner */}
                       <svg className="absolute inset-[-10%] w-[120%] h-[120%] -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" className={`text-white/10`} />
                          {isConnecting && (
                              <circle cx="50" cy="50" r="48" fill="none" stroke="url(#spinner-gradient)" strokeWidth="2" strokeLinecap="round" className="animate-[spin_1.5s_linear_infinite] origin-center" />
                          )}
                          {isConnected && (
                            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" className={`${selectedPersonality.color.replace('bg-', 'text-')} opacity-60`} strokeDasharray="301" strokeDashoffset="0">
                              <animate attributeName="stroke-dashoffset" from="301" to="0" dur="4s" repeatCount="indefinite" />
                            </circle>
                          )}
                          <defs>
                            <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
                              <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
                            </linearGradient>
                          </defs>
                       </svg>
                   </div>
                </div>

                {/* Bottom Controls Area */}
                <div className="relative z-10 flex flex-col items-center w-full gap-4 flex-none">
                  
                  {/* Visualizer Strip */}
                  <div className="w-full h-12 sm:h-16 flex items-center justify-center px-4">
                    {isConnected ? (
                       <AudioVisualizer active={true} color={selectedPersonality.color} />
                    ) : isConnecting ? (
                       <div className="flex items-center justify-center gap-1 h-8">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-1 bg-blue-400/60 rounded-full" style={{ height: '40%', animation: `wave 1s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}></div>
                          ))}
                       </div>
                    ) : (
                       <div className="flex gap-2 opacity-30"><span className="w-1.5 h-1.5 bg-white rounded-full"></span><span className="w-1.5 h-1.5 bg-white rounded-full"></span><span className="w-1.5 h-1.5 bg-white rounded-full"></span></div>
                    )}
                  </div>

                  {/* Mic Button */}
                  <div className="h-20 flex items-center justify-center">
                     {!isConnected && !isConnecting && (
                       <button 
                         onClick={handleConnect}
                         onMouseEnter={() => playUiSound('hover')}
                         className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-transform border-4 border-[#0f172a]"
                       >
                         <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white/20" />
                       </button>
                     )}
                     
                     {isConnected && (
                       <button 
                         onClick={handleDisconnect}
                         onMouseEnter={() => playUiSound('hover')}
                         className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-110 transition-transform border-4 border-[#0f172a]"
                       >
                         <MicOff className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white/20" />
                       </button>
                     )}
                  </div>
                   
                   {error && (
                     <div className="w-max max-w-xs bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] px-3 py-1 rounded-lg backdrop-blur-md">
                       {error}
                     </div>
                   )}
                </div>

              </div>

              {/* Game End Overlay */}
              {appState === AppState.FINISHED && winner && (
                <GameEndScreen 
                  winner={winner} 
                  score={score} 
                  onPlayAgain={handlePlayAgain} 
                  onExit={handleReturnToMenu} 
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

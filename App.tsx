
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0f172a] text-white selection:bg-white/30">
      
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

      {/* Liquid Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 -left-4 w-96 h-96 ${blobColors[0]} rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob`}></div>
        <div className={`absolute top-0 -right-4 w-96 h-96 ${blobColors[1]} rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-2000`}></div>
        <div className={`absolute -bottom-8 left-20 w-96 h-96 ${blobColors[2]} rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000`}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Floating Glass Header */}
      <header className="relative z-20 flex justify-center pt-6 mb-4">
        <div className="mx-4 px-2 py-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-4 shadow-2xl shadow-black/10 pr-4">
          <div className="flex items-center gap-3 pl-2">
            <div className="p-2 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full shadow-lg">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 hidden sm:block">
                Viet Trivia AI
              </h1>
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/10"></div>
          
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

          <div className="h-6 w-px bg-white/10"></div>

          <div className="flex items-center gap-2 text-xs font-medium text-white/60">
            <span className={`relative flex h-2 w-2`}>
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-white/30'}`}></span>
            </span>
            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Ready'}</span>
          </div>

          {(appState === AppState.GAME || appState === AppState.FINISHED) && (
             <button 
               onClick={handleEndGame}
               onMouseEnter={() => playUiSound('hover')}
               className="ml-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all border border-white/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
             >
               End Session
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center p-4 md:p-6 max-w-6xl mx-auto w-full min-h-[85vh]">
        
        {appState === AppState.SETUP && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            
            {/* Left Col: Info & Fact */}
            <div className="lg:col-span-4 flex flex-col gap-6">
               <div className="group relative p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden transition-all hover:bg-white/10">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-wide text-white/90">Daily Insight</h2>
                  </div>

                  {factLoading ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-3 text-white/40">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm font-light">Scanning the globe...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-lg font-light leading-relaxed text-white/80">
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
                              className="text-[10px] uppercase tracking-wider font-semibold bg-black/20 hover:bg-black/40 text-white/60 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              Source {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
               </div>

               <div className="p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/5 shadow-inner">
                    <Sparkles className="w-8 h-8 text-yellow-200/80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Choose a Host</h3>
                    <p className="text-sm text-white/50 mt-1">Select an AI personality to guide your game.</p>
                  </div>
               </div>
            </div>

            {/* Right Col: Personalities */}
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                 {PERSONALITIES.map(p => {
                   const isSelected = selectedPersonality.id === p.id;
                   return (
                     <div 
                       key={p.id}
                       onClick={() => handlePersonalitySelect(p)}
                       onMouseEnter={() => playUiSound('hover')}
                       className={`
                         relative group cursor-pointer rounded-[2rem] p-6 transition-all duration-500
                         flex flex-col justify-between overflow-hidden
                         ${isSelected 
                           ? 'bg-white/10 border-white/30 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] scale-105 z-10' 
                           : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 scale-100 opacity-70 hover:opacity-100'}
                         backdrop-blur-xl border
                       `}
                     >
                        {/* Glass shine effect */}
                        <div className={`absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shimmer ${isSelected ? 'left-[150%]' : 'left-[-100%]'}`} />

                        <div className="relative z-10">
                          <div className={`
                            w-14 h-14 rounded-2xl mb-6 flex items-center justify-center shadow-lg
                            ${isSelected ? `bg-gradient-to-br from-${p.color.replace('bg-', '')} to-gray-900` : 'bg-white/5'}
                          `}>
                             <span className="text-2xl font-bold">{p.name.charAt(0)}</span>
                          </div>
                          
                          <h3 className="text-xl font-bold mb-2 text-white">{p.name}</h3>
                          <p className="text-sm text-white/60 leading-relaxed">{p.description}</p>
                        </div>
                        
                        <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-medium text-white/40 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />
                            {p.voiceName}
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                        </div>
                     </div>
                   );
                 })}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleStartGame}
                  onMouseEnter={() => playUiSound('hover')}
                  className="group relative px-10 py-5 rounded-full overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all group-hover:opacity-90"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                  <div className="relative flex items-center gap-3 text-lg font-bold tracking-wide">
                    <span>Start Game</span>
                    <PlayCircle className="w-5 h-5 fill-white/20" />
                  </div>
                </button>
              </div>
            </div>

          </div>
        )}

        {(appState === AppState.GAME || appState === AppState.FINISHED) && (
          <div className="w-full h-full flex flex-col items-center justify-center flex-1 animate-fade-in relative">
            
            {/* Scoreboard */}
            <ScoreBoard 
              score={score} 
              winningScore={gameSettings.winningScore} 
              activeColor={selectedPersonality.color}
            />

            {/* Central Glass Hub */}
            <div className="relative w-full max-w-xl aspect-square md:aspect-auto md:h-[550px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-between p-12 overflow-hidden">
              
              {/* Decorative Internal Gradients */}
              <div className={`absolute top-[-20%] right-[-20%] w-[80%] h-[80%] ${blobColors[0]} rounded-full mix-blend-overlay filter blur-[80px] opacity-40 animate-blob`}></div>
              <div className={`absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] ${blobColors[1]} rounded-full mix-blend-overlay filter blur-[80px] opacity-40 animate-blob animation-delay-2000`}></div>

              {/* Header Info */}
              <div className="relative z-10 text-center space-y-2">
                 <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium tracking-wider text-white/60">
                    <Disc className={`w-3 h-3 ${isConnected ? 'animate-spin' : ''}`} />
                    SESSION ACTIVE
                 </div>
                 <h2 className="text-4xl font-bold text-white drop-shadow-lg">{selectedPersonality.name}</h2>
                 <p className="text-white/50 font-light">{isConnecting ? 'Establishing connection...' : 'Listening for answers...'}</p>
              </div>

              {/* Dynamic Avatar */}
              <div className="relative z-10 my-4 group">
                 <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse ${selectedPersonality.color}`}></div>
                 <div className="relative w-48 h-48 rounded-full bg-gradient-to-b from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-inner backdrop-blur-sm overflow-hidden">
                    {/* Liquid surface reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
                    <div className="text-6xl font-bold text-white/80 mix-blend-overlay">{selectedPersonality.name.charAt(0)}</div>
                 </div>
                 
                 {/* Status Indicator Ring */}
                 <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="1" className={`text-white/10`} />
                    {isConnected && (
                      <circle 
                        cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="2" 
                        className={`${selectedPersonality.color.replace('bg-', 'text-')} opacity-50`} 
                        strokeDasharray="308" 
                        strokeDashoffset="0"
                      >
                        <animate attributeName="stroke-dashoffset" from="308" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                 </svg>
              </div>

              {/* Visualizer Area */}
              <div className="relative z-10 w-full h-24 flex items-center justify-center">
                {isConnected ? (
                   <div className="w-full px-8">
                      <AudioVisualizer active={true} color={selectedPersonality.color} />
                   </div>
                ) : (
                   <div className="flex gap-2">
                     <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce delay-200"></span>
                   </div>
                )}
              </div>

              {/* Controls */}
              <div className="relative z-10 mt-4">
                 {!isConnected && !isConnecting && (
                   <button 
                     onClick={handleConnect}
                     onMouseEnter={() => playUiSound('hover')}
                     className="w-20 h-20 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-transform border-4 border-[#0f172a]"
                   >
                     <Mic className="w-8 h-8 text-white fill-white/20" />
                   </button>
                 )}
                 
                 {isConnected && (
                   <button 
                     onClick={handleDisconnect}
                     onMouseEnter={() => playUiSound('hover')}
                     className="w-20 h-20 rounded-full bg-gradient-to-b from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-110 transition-transform border-4 border-[#0f172a]"
                   >
                     <MicOff className="w-8 h-8 text-white fill-white/20" />
                   </button>
                 )}
                 
                 {error && (
                   <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-max max-w-xs bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-2 rounded-lg backdrop-blur-md">
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
      </main>
    </div>
  );
};

export default App;

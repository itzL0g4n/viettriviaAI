
export enum AppState {
  SETUP = 'SETUP',
  GAME = 'GAME',
  FINISHED = 'FINISHED',
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  voiceName: string;
  color: string;
}

export interface SearchResult {
  text: string;
  sources: { uri: string; title: string }[];
}

export interface GameSettings {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  roundDuration: number; // in seconds
  winningScore: number;
  musicVolume: number; // 0.0 to 1.0
}

export interface Score {
  player: number;
  ai: number;
}

// Live API Types
export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

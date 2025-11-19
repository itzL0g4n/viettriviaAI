export enum AppState {
  SETUP = 'SETUP',
  GAME = 'GAME',
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

// Live API Types
export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

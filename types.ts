export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  audioUrl?: string; // For TTS
  isAudioLoading?: boolean;
  timestamp: number;
}

export interface Language {
  code: string;
  name: string;
  voiceName: string; // Gemini TTS voice name
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  mistakeType: string;
}

export interface VocabularySuggestion {
  term: string;
  pronunciation: string;
  translation: string;
  example: string;
}

export interface GrammarPoint {
  ruleName: string;
  explanation: string;
  exampleFromChat: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
}

export interface ReviewSession {
  summary: GrammarPoint[];
  quiz: QuizQuestion[];
}

export interface AppState {
  targetLanguage: Language | null;
  nativeLanguage: Language | null;
  selectedScenario: Scenario | null;
  messages: Message[];
  isConfigured: boolean;
  autoPlayAudio: boolean;
}
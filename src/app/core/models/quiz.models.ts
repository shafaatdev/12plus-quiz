export interface Vocabulary {
  id: number;
  word: string;
  meaning: string;
  example: string;
  options: string[];
}

export interface QuizQuestion {
  vocabularyId: number;
  number: number;
  word: string;
  meaning: string;
  example: string;
  options: string[];
  selectedAnswer: string | null;
  isCorrect: boolean | null;
}

export interface QuizSession {
  id: string;
  startedAt: string;
  completedAt: string | null;
  questionCount: number;
  correctCount: number;
  questions: QuizQuestion[];
}
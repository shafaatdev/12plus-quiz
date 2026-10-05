export const NON_VERBAL_CHOICES = ['A', 'B', 'C', 'D', 'E'] as const;

export type NonVerbalChoice = (typeof NON_VERBAL_CHOICES)[number];

export interface NonVerbalQuestionDefinition {
  id: string;
  answer: NonVerbalChoice;
}

export interface NonVerbalQuestionResult extends NonVerbalQuestionDefinition {
  number: number;
  selectedAnswer: NonVerbalChoice | null;
  isCorrect: boolean | null;
  durationMs: number | null;
}

export interface NonVerbalAttempt {
  id: string;
  startedAt: string;
  startedAtMs: number;
  completedAt: string | null;
  completedAtMs: number | null;
  totalDurationMs: number | null;
  correctCount: number;
  questions: NonVerbalQuestionResult[];
}
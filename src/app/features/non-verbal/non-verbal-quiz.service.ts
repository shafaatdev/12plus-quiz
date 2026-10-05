import { Injectable, computed, signal } from '@angular/core';
import { NON_VERBAL_QUESTIONS } from './non-verbal-question-bank';
import {
  NonVerbalAttempt,
  NonVerbalChoice,
  NonVerbalQuestionResult,
} from './non-verbal.models';

const historyStorageKey = 'vocab-master-non-verbal-history-v1';
const questionCount = 10;

@Injectable({ providedIn: 'root' })
export class NonVerbalQuizService {
  readonly attempts = signal<NonVerbalAttempt[]>(this.readAttempts());
  readonly activeAttempt = signal<NonVerbalAttempt | null>(null);
  readonly questionIndex = signal(0);
  readonly currentQuestionStartedAtMs = signal(0);
  readonly currentQuestion = computed(
    () => this.activeAttempt()?.questions[this.questionIndex()] ?? null,
  );
  readonly progress = computed(() =>
    this.activeAttempt()
      ? Math.round(((this.questionIndex() + 1) / questionCount) * 100)
      : 0,
  );
  readonly answeredCount = computed(
    () => this.activeAttempt()?.questions.filter((question) => question.isCorrect !== null).length ?? 0,
  );

  startQuiz(): void {
    const startedAtMs = Date.now();
    const questions: NonVerbalQuestionResult[] = this.shuffle(NON_VERBAL_QUESTIONS)
      .slice(0, questionCount)
      .map((question) => ({
        ...question,
        selectedAnswer: null,
        isCorrect: null,
        durationMs: null,
      }));

    this.activeAttempt.set({
      id: crypto.randomUUID(),
      startedAt: new Date(startedAtMs).toISOString(),
      startedAtMs,
      completedAt: null,
      completedAtMs: null,
      totalDurationMs: null,
      correctCount: 0,
      questions,
    });
    this.questionIndex.set(0);
    this.currentQuestionStartedAtMs.set(startedAtMs);
  }

  answerCurrentQuestion(answer: NonVerbalChoice): void {
    const attempt = this.activeAttempt();
    const question = this.currentQuestion();
    if (!attempt || !question || question.isCorrect !== null) return;

    const updatedQuestion: NonVerbalQuestionResult = {
      ...question,
      selectedAnswer: answer,
      isCorrect: answer === question.answer,
      durationMs: Math.max(0, Date.now() - this.currentQuestionStartedAtMs()),
    };
    this.updateQuestion(attempt, updatedQuestion);
  }

  advance(): boolean {
    const attempt = this.activeAttempt();
    if (!attempt || this.currentQuestion()?.isCorrect === null) return false;

    if (this.questionIndex() + 1 < attempt.questions.length) {
      this.questionIndex.update((index) => index + 1);
      this.currentQuestionStartedAtMs.set(Date.now());
      return false;
    }

    const completedAtMs = Date.now();
    const completed: NonVerbalAttempt = {
      ...attempt,
      completedAt: new Date(completedAtMs).toISOString(),
      completedAtMs,
      totalDurationMs: Math.max(0, completedAtMs - attempt.startedAtMs),
    };
    this.activeAttempt.set(completed);
    this.attempts.update((attempts) => [completed, ...attempts]);
    this.persistAttempts();
    return true;
  }

  private updateQuestion(attempt: NonVerbalAttempt, question: NonVerbalQuestionResult): void {
    const updatedQuestions = attempt.questions.map((item) => item.id === question.id ? question : item);
    this.activeAttempt.set({
      ...attempt,
      correctCount: updatedQuestions.filter((item) => item.isCorrect === true).length,
      questions: updatedQuestions,
    });
  }

  private readAttempts(): NonVerbalAttempt[] {
    try {
      const stored = localStorage.getItem(historyStorageKey);
      if (!stored) return [];
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(this.isAttempt) : [];
    } catch {
      return [];
    }
  }

  private readonly isAttempt = (value: unknown): value is NonVerbalAttempt => {
    if (!value || typeof value !== 'object') return false;
    const attempt = value as Partial<NonVerbalAttempt>;
    return typeof attempt.id === 'string'
      && typeof attempt.startedAt === 'string'
      && typeof attempt.startedAtMs === 'number'
      && typeof attempt.correctCount === 'number'
      && Array.isArray(attempt.questions);
  };

  private persistAttempts(): void {
    localStorage.setItem(historyStorageKey, JSON.stringify(this.attempts()));
  }

  private shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }
}
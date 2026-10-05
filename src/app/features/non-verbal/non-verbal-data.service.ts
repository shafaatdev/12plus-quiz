import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  NonVerbalAttempt,
  NonVerbalChoice,
  NonVerbalQuestionDefinition,
  NonVerbalQuestionResult,
} from './non-verbal.models';

const questionCount = 10;
const pageSize = 1000;

interface QuestionRow {
  question_id: string;
  correct_answer: NonVerbalChoice;
}

interface ProgressRow {
  question_id: string;
}

interface AttemptRow {
  id: string;
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
  question_count: number;
  correct_count: number;
}

interface AttemptQuestionRow {
  quiz_id: string;
  question_number: number;
  question_id: string;
  correct_answer: NonVerbalChoice;
  selected_answer: NonVerbalChoice | null;
  is_correct: boolean | null;
  duration_ms: number | null;
}

@Injectable({ providedIn: 'root' })
export class NonVerbalDataService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  readonly questionBank = signal<NonVerbalQuestionDefinition[]>([]);
  readonly masteredIds = signal<string[]>([]);
  readonly attempts = signal<NonVerbalAttempt[]>([]);
  readonly activeAttempt = signal<NonVerbalAttempt | null>(null);
  readonly questionIndex = signal(0);
  readonly currentQuestionStartedAtMs = signal(0);
  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly availableQuestionCount = computed(() => {
    const mastered = new Set(this.masteredIds());
    return this.questionBank().filter((question) => !mastered.has(question.id)).length;
  });
  readonly currentQuestion = computed(
    () => this.activeAttempt()?.questions[this.questionIndex()] ?? null,
  );
  readonly progress = computed(() => {
    const attempt = this.activeAttempt();
    return attempt ? Math.round(((this.questionIndex() + 1) / attempt.questions.length) * 100) : 0;
  });
  readonly answeredCount = computed(
    () => this.activeAttempt()?.questions.filter((question) => question.isCorrect !== null).length ?? 0,
  );

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.activeAttempt.set(null);

    try {
      const client = this.requireClient();
      const userId = this.requireUserId();
      const [questionResult, progressResult, attempts] = await Promise.all([
        client.from('non_verbal_questions').select('question_id, correct_answer').order('question_id'),
        client.from('user_non_verbal_progress').select('question_id').eq('user_id', userId),
        this.fetchCompletedAttempts(client, userId),
      ]);
      if (questionResult.error) throw questionResult.error;
      if (progressResult.error) throw progressResult.error;

      const questionRows = (questionResult.data ?? []) as unknown as QuestionRow[];
      const progressRows = (progressResult.data ?? []) as unknown as ProgressRow[];
      const attemptQuestions = await this.fetchAttemptQuestions(client, attempts.map((attempt) => attempt.id));
      const questionsByAttempt = new Map<string, AttemptQuestionRow[]>();
      for (const row of attemptQuestions) {
        const rows = questionsByAttempt.get(row.quiz_id) ?? [];
        rows.push(row);
        questionsByAttempt.set(row.quiz_id, rows);
      }

      this.questionBank.set(questionRows.map((row) => ({ id: row.question_id, answer: row.correct_answer })));
      this.masteredIds.set(progressRows.map((row) => row.question_id));
      this.attempts.set(attempts.map((attempt) => this.toAttempt(attempt, questionsByAttempt.get(attempt.id) ?? [])));
    } catch (error) {
      this.error.set(this.errorMessage(error));
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async startQuiz(): Promise<boolean> {
    this.pending.set(true);
    this.error.set('');
    try {
      const client = this.requireClient();
      const userId = this.requireUserId();
      const mastered = new Set(this.masteredIds());
      const eligible = this.shuffle(this.questionBank().filter((question) => !mastered.has(question.id)));
      if (!eligible.length) {
        this.error.set('You have mastered every available question.');
        return false;
      }

      const startedAtMs = Date.now();
      const questions: NonVerbalQuestionResult[] = eligible.slice(0, questionCount).map((question, index) => ({
        ...question,
        number: index + 1,
        selectedAnswer: null,
        isCorrect: null,
        durationMs: null,
      }));
      const attempt: NonVerbalAttempt = {
        id: crypto.randomUUID(),
        startedAt: new Date(startedAtMs).toISOString(),
        startedAtMs,
        completedAt: null,
        completedAtMs: null,
        totalDurationMs: null,
        correctCount: 0,
        questions,
      };

      const { error: attemptError } = await client.from('non_verbal_quiz_attempts').insert({
        id: attempt.id,
        user_id: userId,
        started_at: attempt.startedAt,
        question_count: questions.length,
        correct_count: 0,
      });
      if (attemptError) throw attemptError;

      const { error: questionError } = await client.from('non_verbal_quiz_questions').insert(
        questions.map((question) => ({
          quiz_id: attempt.id,
          question_number: question.number,
          question_id: question.id,
          correct_answer: question.answer,
        })),
      );
      if (questionError) {
        await client.from('non_verbal_quiz_attempts').delete().eq('id', attempt.id);
        throw questionError;
      }

      this.activeAttempt.set(attempt);
      this.questionIndex.set(0);
      this.currentQuestionStartedAtMs.set(startedAtMs);
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    } finally {
      this.pending.set(false);
    }
  }

  async answerCurrentQuestion(answer: NonVerbalChoice): Promise<void> {
    const attempt = this.activeAttempt();
    const question = this.currentQuestion();
    if (!attempt || !question || question.isCorrect !== null) return;

    const client = this.requireClient();
    const userId = this.requireUserId();
    const updatedQuestion: NonVerbalQuestionResult = {
      ...question,
      selectedAnswer: answer,
      isCorrect: answer === question.answer,
      durationMs: Math.max(0, Date.now() - this.currentQuestionStartedAtMs()),
    };
    const correctCount = attempt.correctCount + Number(updatedQuestion.isCorrect);

    this.pending.set(true);
    this.error.set('');
    try {
      const { error: answerError } = await client
        .from('non_verbal_quiz_questions')
        .update({ selected_answer: answer, is_correct: updatedQuestion.isCorrect, duration_ms: updatedQuestion.durationMs })
        .eq('quiz_id', attempt.id)
        .eq('question_number', question.number);
      if (answerError) throw answerError;

      if (updatedQuestion.isCorrect) {
        const { error: progressError } = await client
          .from('user_non_verbal_progress')
          .upsert(
            { user_id: userId, question_id: question.id, mastered_at: new Date().toISOString() },
            { onConflict: 'user_id,question_id' },
          );
        if (progressError) throw progressError;
      }

      const { error: scoreError } = await client
        .from('non_verbal_quiz_attempts')
        .update({ correct_count: correctCount })
        .eq('id', attempt.id);
      if (scoreError) throw scoreError;

      this.updateQuestion(attempt, updatedQuestion);
      this.activeAttempt.update((current) => current ? { ...current, correctCount } : current);
      if (updatedQuestion.isCorrect && !this.masteredIds().includes(question.id)) {
        this.masteredIds.update((ids) => [...ids, question.id]);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
      throw error;
    } finally {
      this.pending.set(false);
    }
  }

  async advance(): Promise<boolean> {
    const attempt = this.activeAttempt();
    if (!attempt || this.currentQuestion()?.isCorrect === null) return false;
    this.error.set('');

    if (this.questionIndex() + 1 < attempt.questions.length) {
      this.questionIndex.update((index) => index + 1);
      this.currentQuestionStartedAtMs.set(Date.now());
      return false;
    }

    const client = this.requireClient();
    const completedAtMs = Date.now();
    const completedAt = new Date(completedAtMs).toISOString();
    const totalDurationMs = Math.max(0, completedAtMs - attempt.startedAtMs);

    this.pending.set(true);
    try {
      const { error } = await client
        .from('non_verbal_quiz_attempts')
        .update({ completed_at: completedAt, total_duration_ms: totalDurationMs })
        .eq('id', attempt.id);
      if (error) throw error;

      const completed: NonVerbalAttempt = { ...attempt, completedAt, completedAtMs, totalDurationMs };
      this.activeAttempt.set(completed);
      this.attempts.update((attempts) => [completed, ...attempts]);
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    } finally {
      this.pending.set(false);
    }
  }

  async discardActiveAttempt(): Promise<void> {
    const attempt = this.activeAttempt();
    if (!attempt) return;
    const client = this.requireClient();
    const { error } = await client.from('non_verbal_quiz_attempts').delete().eq('id', attempt.id);
    if (error) throw error;
    this.activeAttempt.set(null);
    this.error.set('');
  }

  private updateQuestion(attempt: NonVerbalAttempt, question: NonVerbalQuestionResult): void {
    const updatedQuestions = attempt.questions.map((item) => item.id === question.id ? question : item);
    this.activeAttempt.update((current) => current ? {
      ...current,
      correctCount: updatedQuestions.filter((item) => item.isCorrect === true).length,
      questions: updatedQuestions,
    } : current);
  }

  private async fetchCompletedAttempts(
    client: NonNullable<SupabaseService['client']>,
    userId: string,
  ): Promise<AttemptRow[]> {
    const attempts: AttemptRow[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from('non_verbal_quiz_attempts')
        .select('id, started_at, completed_at, total_duration_ms, question_count, correct_count')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      const page = (data ?? []) as unknown as AttemptRow[];
      attempts.push(...page);
      if (page.length < pageSize) return attempts;
    }
  }

  private async fetchAttemptQuestions(
    client: NonNullable<SupabaseService['client']>,
    attemptIds: string[],
  ): Promise<AttemptQuestionRow[]> {
    const rows: AttemptQuestionRow[] = [];
    for (let idOffset = 0; idOffset < attemptIds.length; idOffset += 50) {
      const ids = attemptIds.slice(idOffset, idOffset + 50);
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await client
          .from('non_verbal_quiz_questions')
          .select('quiz_id, question_number, question_id, correct_answer, selected_answer, is_correct, duration_ms')
          .in('quiz_id', ids)
          .order('quiz_id')
          .order('question_number')
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        const page = (data ?? []) as unknown as AttemptQuestionRow[];
        rows.push(...page);
        if (page.length < pageSize) break;
      }
    }
    return rows;
  }

  private toAttempt(row: AttemptRow, questionRows: AttemptQuestionRow[]): NonVerbalAttempt {
    return {
      id: row.id,
      startedAt: row.started_at,
      startedAtMs: Date.parse(row.started_at),
      completedAt: row.completed_at,
      completedAtMs: Date.parse(row.completed_at),
      totalDurationMs: row.total_duration_ms,
      correctCount: row.correct_count,
      questions: questionRows
        .filter((question) => question.quiz_id === row.id)
        .sort((first, second) => first.question_number - second.question_number)
        .map((question) => ({
          id: question.question_id,
          answer: question.correct_answer,
          number: question.question_number,
          selectedAnswer: question.selected_answer,
          isCorrect: question.is_correct,
          durationMs: question.duration_ms,
        })),
    };
  }

  private shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  private requireClient(): NonNullable<SupabaseService['client']> {
    if (!this.supabase.client) throw new Error('Supabase is not configured.');
    return this.supabase.client;
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Sign in to start and save a Non Verbal test.');
    return userId;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}
import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { QuizQuestion, QuizSession, Vocabulary } from '../models/quiz.models';

const previewStorageKey = 'vocab-master-preview-v1';
const quizLength = 15;
const vocabularyPageSize = 1000;
const vocabularyLoadLimit = 2500;

interface PreviewData {
  masteredIds: number[];
  history: QuizSession[];
}

interface AttemptRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  question_count: number;
  correct_count: number;
}

interface QuestionRow {
  quiz_id: string;
  question_number: number;
  vocabulary_id: number;
  word: string;
  meaning: string;
  example: string;
  options: string[];
  selected_answer: string | null;
  is_correct: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  readonly words = signal<Vocabulary[]>([]);
  readonly masteredIds = signal<number[]>([]);
  readonly history = signal<QuizSession[]>([]);

  async initializePreview(): Promise<void> {
    const response = await fetch('/vocabularies.json');
    if (!response.ok) throw new Error('The vocabulary file could not be loaded.');
    this.words.set((await response.json()) as Vocabulary[]);
    this.restorePreview();
  }

  async refreshFromSupabase(): Promise<void> {
    const client = this.supabase.client;
    const userId = this.auth.user()?.id;
    if (!client || !userId) return;

    const [vocabularies, progressResult, attemptResult] = await Promise.all([
      this.fetchVocabularies(client),
      client.from('user_word_progress').select('vocabulary_id').eq('user_id', userId),
      client
        .from('quiz_attempts')
        .select('id, started_at, completed_at, question_count, correct_count')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
    ]);
    if (progressResult.error) throw progressResult.error;
    if (attemptResult.error) throw attemptResult.error;

    const attempts = (attemptResult.data ?? []) as unknown as AttemptRow[];
    const questionsByQuiz = new Map<string, QuestionRow[]>();
    if (attempts.length) {
      const questionResult = await client
        .from('quiz_questions')
        .select('quiz_id, question_number, vocabulary_id, word, meaning, example, options, selected_answer, is_correct')
        .in('quiz_id', attempts.map((attempt) => attempt.id))
        .order('question_number');
      if (questionResult.error) throw questionResult.error;
      for (const question of (questionResult.data ?? []) as unknown as QuestionRow[]) {
        const rows = questionsByQuiz.get(question.quiz_id) ?? [];
        rows.push(question);
        questionsByQuiz.set(question.quiz_id, rows);
      }
    }

    this.words.set(vocabularies);
    this.masteredIds.set(
      ((progressResult.data ?? []) as unknown as { vocabulary_id: number }[]).map(
        (progress) => progress.vocabulary_id,
      ),
    );
    this.history.set(
      attempts.map((attempt) => ({
        id: attempt.id,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at,
        questionCount: attempt.question_count,
        correctCount: attempt.correct_count,
        questions: (questionsByQuiz.get(attempt.id) ?? []).map((question) => ({
          vocabularyId: question.vocabulary_id,
          number: question.question_number,
          word: question.word,
          meaning: question.meaning,
          example: question.example,
          options: question.options,
          selectedAnswer: question.selected_answer,
          isCorrect: question.is_correct,
        })),
      })),
    );
  }

  async createQuiz(): Promise<QuizSession | null> {
    const mastered = new Set(this.masteredIds());
    const eligible = this.shuffle(this.words().filter((word) => !mastered.has(word.id)));
    if (!eligible.length) return null;

    const questions: QuizQuestion[] = eligible.slice(0, quizLength).map((word, index) => {
      const choices = [...new Set([word.meaning, ...word.options])];
      const extraMeanings = this.shuffle(
        this.words()
          .filter((candidate) => candidate.id !== word.id)
          .map((candidate) => candidate.meaning)
          .filter((meaning) => !choices.includes(meaning)),
      );
      return {
        vocabularyId: word.id,
        number: index + 1,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        options: this.shuffle([...choices, ...extraMeanings].slice(0, 5)),
        selectedAnswer: null,
        isCorrect: null,
      };
    });
    const session: QuizSession = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionCount: questions.length,
      correctCount: 0,
      questions,
    };

    if (this.supabase.client) {
      const userId = this.requireUserId();
      const { error: attemptError } = await this.supabase.client.from('quiz_attempts').insert({
        id: session.id,
        user_id: userId,
        started_at: session.startedAt,
        question_count: session.questionCount,
        correct_count: 0,
      });
      if (attemptError) throw attemptError;

      const { error: questionError } = await this.supabase.client.from('quiz_questions').insert(
        questions.map((question) => ({
          quiz_id: session.id,
          question_number: question.number,
          vocabulary_id: question.vocabularyId,
          word: question.word,
          meaning: question.meaning,
          example: question.example,
          options: question.options,
          correct_answer: question.meaning,
        })),
      );
      if (questionError) {
        await this.supabase.client.from('quiz_attempts').delete().eq('id', session.id);
        throw questionError;
      }
    }

    this.history.update((history) => [session, ...history]);
    this.persistPreview();
    return session;
  }

  async recordAnswer(sessionId: string, question: QuizQuestion, answer: string): Promise<QuizSession> {
    const current = this.history().find((session) => session.id === sessionId);
    if (!current) throw new Error('This quiz is no longer available.');
    if (question.isCorrect !== null) throw new Error('This question has already been answered.');
    const isCorrect = answer === question.meaning;
    const updated: QuizSession = {
      ...current,
      correctCount: current.correctCount + Number(isCorrect),
      questions: current.questions.map((item) =>
        item.number === question.number
          ? { ...item, selectedAnswer: answer, isCorrect }
          : item,
      ),
    };

    if (this.supabase.client) {
      const userId = this.requireUserId();
      const { error: answerError } = await this.supabase.client
        .from('quiz_questions')
        .update({ selected_answer: answer, is_correct: isCorrect })
        .eq('quiz_id', sessionId)
        .eq('question_number', question.number);
      if (answerError) throw answerError;

      if (isCorrect) {
        const { error: progressError } = await this.supabase.client
          .from('user_word_progress')
          .upsert(
            { user_id: userId, vocabulary_id: question.vocabularyId, mastered_at: new Date().toISOString() },
            { onConflict: 'user_id,vocabulary_id' },
          );
        if (progressError) throw progressError;
      }

      const { error: scoreError } = await this.supabase.client
        .from('quiz_attempts')
        .update({ correct_count: updated.correctCount })
        .eq('id', sessionId);
      if (scoreError) throw scoreError;
    }

    this.history.update((history) => history.map((item) => (item.id === sessionId ? updated : item)));
    if (isCorrect && !this.masteredIds().includes(question.vocabularyId)) {
      this.masteredIds.update((ids) => [...ids, question.vocabularyId]);
    }
    this.persistPreview();
    return updated;
  }

  async completeQuiz(sessionId: string): Promise<QuizSession> {
    const session = this.history().find((item) => item.id === sessionId);
    if (!session) throw new Error('This quiz is no longer available.');
    const completed: QuizSession = { ...session, completedAt: new Date().toISOString() };

    if (this.supabase.client) {
      const { error } = await this.supabase.client
        .from('quiz_attempts')
        .update({ completed_at: completed.completedAt, correct_count: completed.correctCount })
        .eq('id', sessionId);
      if (error) throw error;
    }

    this.history.update((history) => history.map((item) => (item.id === sessionId ? completed : item)));
    this.persistPreview();
    return completed;
  }

  async resetProgress(): Promise<void> {
    if (this.supabase.client) {
      const userId = this.requireUserId();
      const { error } = await this.supabase.client
        .from('user_word_progress')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    }
    this.masteredIds.set([]);
    this.persistPreview();
  }

  async clearAll(): Promise<void> {
    if (this.supabase.client) {
      const userId = this.requireUserId();
      const { error: attemptsError } = await this.supabase.client
        .from('quiz_attempts')
        .delete()
        .eq('user_id', userId);
      if (attemptsError) throw attemptsError;
      const { error: progressError } = await this.supabase.client
        .from('user_word_progress')
        .delete()
        .eq('user_id', userId);
      if (progressError) throw progressError;
    }
    this.history.set([]);
    this.masteredIds.set([]);
    this.persistPreview();
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Sign in to save your quiz progress.');
    return userId;
  }

  private async fetchVocabularies(
    client: NonNullable<SupabaseService['client']>,
  ): Promise<Vocabulary[]> {
    const vocabularies: Vocabulary[] = [];

    for (let offset = 0; offset < vocabularyLoadLimit; offset += vocabularyPageSize) {
      const pageLimit = Math.min(vocabularyPageSize, vocabularyLoadLimit - offset);
      const { data, error } = await client
        .from('vocabularies')
        .select('id, word, meaning, example, options')
        .order('id')
        .range(offset, offset + pageLimit - 1);
      if (error) throw error;

      const page = (data ?? []) as unknown as Vocabulary[];
      vocabularies.push(...page);
      if (page.length < pageLimit) break;
    }

    return vocabularies;
  }

  private restorePreview(): void {
    try {
      const saved = localStorage.getItem(previewStorageKey);
      const data = saved ? (JSON.parse(saved) as PreviewData) : null;
      this.masteredIds.set(data?.masteredIds ?? []);
      this.history.set(data?.history ?? []);
    } catch {
      localStorage.removeItem(previewStorageKey);
      this.masteredIds.set([]);
      this.history.set([]);
    }
  }

  private persistPreview(): void {
    if (this.supabase.isConfigured) return;
    const data: PreviewData = { masteredIds: this.masteredIds(), history: this.history() };
    localStorage.setItem(previewStorageKey, JSON.stringify(data));
  }

  private shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }
}
import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuizSession } from './core/models/quiz.models';
import { AuthService } from './core/services/auth.service';
import { QuizService } from './core/services/quiz.service';
import { SupabaseService } from './core/services/supabase.service';

type Screen = 'home' | 'quiz' | 'results' | 'history' | 'auth';

@Component({
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  selector: 'app-root',
  templateUrl: './app-shell.html',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly data = inject(QuizService);
  private readonly supabase = inject(SupabaseService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly displayNameValidator: ValidatorFn = (control) =>
    typeof control.value === 'string' && control.value.trim() ? null : { required: true };

  readonly screen = signal<Screen>('home');
  readonly loading = signal(true);
  readonly pending = signal(false);
  readonly message = signal('');
  readonly notice = signal('');
  readonly isSignUp = signal(false);
  readonly activeQuiz = signal<QuizSession | null>(null);
  readonly questionIndex = signal(0);
  readonly selectedAnswer = signal('');
  readonly answerSubmitted = signal(false);
  readonly selectedHistoryId = signal('');
  readonly previewMode = !this.supabase.isConfigured;
  readonly authForm = this.formBuilder.nonNullable.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
  });
  private readonly passwordsMatchValidator: ValidatorFn = (control) => {
    const password = control.parent?.get('password')?.value;
    if (!control.value || !password) return null;
    return control.value === password ? null : { passwordMismatch: true };
  };

  readonly words = this.data.words;
  readonly masteredIds = this.data.masteredIds;
  readonly history = this.data.history;
  readonly learnerName = computed(() => {
    const displayName: unknown = this.auth.user()?.user_metadata['display_name'];
    return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Asaad';
  });
  readonly learnerInitial = computed(() => this.learnerName().charAt(0).toUpperCase());
  readonly masteredCount = computed(() => this.masteredIds().length);
  readonly toLearnCount = computed(() => Math.max(0, this.words().length - this.masteredCount()));
  readonly masteryPercent = computed(() =>
    this.words().length ? Math.round((this.masteredCount() / this.words().length) * 100) : 0,
  );
  readonly currentQuestion = computed(
    () => this.activeQuiz()?.questions[this.questionIndex()] ?? null,
  );
  readonly quizProgress = computed(() => {
    const quiz = this.activeQuiz();
    return quiz ? Math.round(((this.questionIndex() + 1) / quiz.questionCount) * 100) : 0;
  });
  readonly reviewQuestions = computed(
    () => this.activeQuiz()?.questions.filter((question) => question.isCorrect === false) ?? [],
  );
  readonly completedHistory = computed(() =>
    this.history().filter((attempt) => attempt.completedAt !== null),
  );
  readonly historyStats = computed(() => {
    const scores = this.completedHistory().map((attempt) => this.scoreFor(attempt));
    return {
      total: scores.length,
      average: scores.length
        ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
        : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
    };
  });

  async ngOnInit(): Promise<void> {
    this.authForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.authForm.controls.confirmPassword.updateValueAndValidity());

    try {
      if (this.supabase.isConfigured) {
        await this.auth.initialize();
        if (this.auth.user()) {
          await this.data.refreshFromSupabase();
          this.screen.set('home');
        } else {
          this.screen.set('auth');
        }
      } else {
        await this.data.initializePreview();
        this.screen.set('home');
      }
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.loading.set(false);
    }
  }

  navigate(screen: 'home' | 'history'): void {
    this.message.set('');
    this.screen.set(screen);
  }

  async startQuiz(): Promise<void> {
    this.pending.set(true);
    this.message.set('');
    try {
      const quiz = await this.data.createQuiz();
      if (!quiz) {
        this.message.set('You have mastered every word. Reset progress to start again.');
        return;
      }
      this.activeQuiz.set(quiz);
      this.questionIndex.set(0);
      this.selectedAnswer.set('');
      this.answerSubmitted.set(false);
      this.screen.set('quiz');
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  async submitAnswer(): Promise<void> {
    const quiz = this.activeQuiz();
    const question = this.currentQuestion();
    const answer = this.selectedAnswer();
    if (!quiz || !question || !answer || this.answerSubmitted()) return;

    this.pending.set(true);
    this.message.set('');
    try {
      const updated = await this.data.recordAnswer(quiz.id, question, answer);
      this.activeQuiz.set(updated);
      this.answerSubmitted.set(true);
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  async nextQuestion(): Promise<void> {
    const quiz = this.activeQuiz();
    if (!quiz) return;

    if (this.questionIndex() + 1 === quiz.questionCount) {
      this.pending.set(true);
      try {
        const completed = await this.data.completeQuiz(quiz.id);
        this.activeQuiz.set(completed);
        this.screen.set('results');
      } catch (error) {
        this.message.set(this.errorText(error));
      } finally {
        this.pending.set(false);
      }
      return;
    }

    this.questionIndex.update((index) => index + 1);
    this.selectedAnswer.set('');
    this.answerSubmitted.set(false);
  }

  async submitAuth(): Promise<void> {
    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.message.set('');
    this.notice.set('');
    const { displayName, email, password } = this.authForm.getRawValue();
    try {
      if (this.isSignUp()) {
        const hasSession = await this.auth.signUp(email, password, displayName.trim());
        if (!hasSession) {
          this.notice.set('Check your email to confirm your account, then sign in.');
          return;
        }
      } else {
        await this.auth.signIn(email, password);
      }
      await this.data.refreshFromSupabase();
      this.screen.set('home');
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  toggleAuthMode(): void {
    const isSignUp = !this.isSignUp();
    this.isSignUp.set(isSignUp);
    const { displayName, confirmPassword } = this.authForm.controls;
    if (isSignUp) {
      displayName.addValidators([this.displayNameValidator, Validators.maxLength(50)]);
      confirmPassword.addValidators([Validators.required, this.passwordsMatchValidator]);
    } else {
      displayName.clearValidators();
      confirmPassword.clearValidators();
      displayName.reset('');
      confirmPassword.reset('');
    }
    displayName.updateValueAndValidity();
    confirmPassword.updateValueAndValidity();
    this.message.set('');
    this.notice.set('');
  }

  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      this.data.words.set([]);
      this.data.masteredIds.set([]);
      this.data.history.set([]);
      this.screen.set('auth');
    } catch (error) {
      this.message.set(this.errorText(error));
    }
  }

  scoreFor(quiz: QuizSession): number {
    return quiz.questionCount ? Math.round((quiz.correctCount / quiz.questionCount) * 100) : 0;
  }

  incorrectCount(quiz: QuizSession): number {
    return quiz.questions.filter((question) => question.isCorrect === false).length;
  }

  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  todayLabel(): string {
    return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  }

  scoreMessage(): string {
    const quiz = this.activeQuiz();
    if (!quiz) return '';
    if (quiz.correctCount === quiz.questionCount) return 'Flawless round. Your focus is paying off.';
    if (quiz.correctCount >= 12) return 'Excellent work. Your vocabulary is getting stronger.';
    if (quiz.correctCount >= 8) return 'Good progress. Every round makes the next one easier.';
    return 'A solid start. Review the tricky words and keep going.';
  }

  dateLabel(value: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  selectHistory(id: string): void {
    this.selectedHistoryId.update((current) => (current === id ? '' : id));
  }

  async resetProgress(): Promise<void> {
    if (!window.confirm('Reset mastered words? Your quiz history will stay.')) return;
    this.pending.set(true);
    try {
      await this.data.resetProgress();
      this.message.set('Progress reset. Your quiz history is unchanged.');
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  async clearAll(): Promise<void> {
    if (!window.confirm('Clear all quiz history and progress? This cannot be undone.')) return;
    this.pending.set(true);
    try {
      await this.data.clearAll();
      this.selectedHistoryId.set('');
      this.message.set('Quiz history and progress cleared.');
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  downloadMistakes(): void {
    const rows = this.completedHistory().flatMap((quiz) =>
      quiz.questions
        .filter((question) => question.isCorrect === false)
        .map((question) => [quiz.startedAt, question.word, question.selectedAnswer ?? '', question.meaning]),
    );
    this.downloadCsv('vocab-mistakes.csv', ['Quiz date', 'Word', 'Your answer', 'Correct meaning'], rows);
  }

  exportReview(quiz: QuizSession): void {
    const rows = quiz.questions
      .filter((question) => question.isCorrect === false)
      .map((question) => [question.word, question.selectedAnswer ?? '', question.meaning, question.example]);
    this.downloadCsv(
      `vocab-review-${quiz.startedAt.slice(0, 10)}.csv`,
      ['Word', 'Your answer', 'Correct meaning', 'Example'],
      rows,
    );
  }

  private downloadCsv(filename: string, headings: string[], rows: string[][]): void {
    const escapeCell = (value: string): string => {
      const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safeValue.replaceAll('"', '""')}"`;
    };
    const csv = [headings, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}

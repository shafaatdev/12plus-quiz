import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { NonVerbalAttempt, NonVerbalChoice, NON_VERBAL_CHOICES } from './non-verbal.models';
import { NonVerbalQuizService } from './non-verbal-quiz.service';

type NonVerbalView = 'overview' | 'quiz' | 'results' | 'history';

@Component({
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatRadioModule, MatTooltipModule],
  selector: 'app-non-verbal-page',
  templateUrl: './non-verbal-page.html',
})
export class NonVerbalPage implements OnInit, OnDestroy {
  readonly quiz = inject(NonVerbalQuizService);
  private readonly confirmation = inject(ConfirmationService);

  readonly view = signal<NonVerbalView>('overview');
  readonly selectedAnswer = signal<NonVerbalChoice | null>(null);
  readonly answerSubmitted = signal(false);
  readonly clock = signal(Date.now());
  readonly selectedHistoryId = signal('');
  readonly choices = NON_VERBAL_CHOICES;
  readonly currentQuestionElapsedMs = computed(() =>
    Math.max(0, this.clock() - this.quiz.currentQuestionStartedAtMs()),
  );
  readonly testElapsedMs = computed(() => {
    const attempt = this.quiz.activeAttempt();
    return attempt
      ? Math.max(0, (attempt.completedAtMs ?? this.clock()) - attempt.startedAtMs)
      : 0;
  });
  readonly historyStats = computed(() => {
    const attempts = this.quiz.attempts();
    const percentages = attempts.map((attempt) => this.scoreFor(attempt));
    return {
      count: attempts.length,
      average: percentages.length
        ? Math.round(percentages.reduce((total, score) => total + score, 0) / percentages.length)
        : 0,
      best: percentages.length ? Math.max(...percentages) : 0,
    };
  });

  private clockInterval: number | null = null;

  ngOnInit(): void {
    this.clockInterval = window.setInterval(() => this.clock.set(Date.now()), 250);
  }

  ngOnDestroy(): void {
    if (this.clockInterval !== null) window.clearInterval(this.clockInterval);
  }

  startQuiz(): void {
    this.quiz.startQuiz();
    this.selectedAnswer.set(null);
    this.answerSubmitted.set(false);
    this.view.set('quiz');
  }

  submitAnswer(): void {
    const selectedAnswer = this.selectedAnswer();
    if (!selectedAnswer || this.answerSubmitted()) return;
    this.quiz.answerCurrentQuestion(selectedAnswer);
    this.answerSubmitted.set(true);
  }

  advanceQuestion(): void {
    if (this.quiz.advance()) {
      this.answerSubmitted.set(false);
      this.selectedAnswer.set(null);
      this.view.set('results');
      return;
    }
    this.answerSubmitted.set(false);
    this.selectedAnswer.set(null);
  }

  async leaveQuiz(): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Leave this test?',
      message: 'Your unfinished test will not be saved.',
      confirmLabel: 'Leave test',
    });
    if (!confirmed) return;
    this.quiz.activeAttempt.set(null);
    this.view.set('overview');
  }

  imageUrl(questionId: string): string {
    return new URL(`NVR/${questionId}.png`, document.baseURI).toString();
  }

  scoreFor(attempt: NonVerbalAttempt): number {
    return attempt.questions.length
      ? Math.round((attempt.correctCount / attempt.questions.length) * 100)
      : 0;
  }

  formatDuration(durationMs: number | null): string {
    if (durationMs === null) return '0:00';
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  dateLabel(value: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  reviewAttempt(id: string): void {
    this.selectedHistoryId.update((current) => current === id ? '' : id);
  }
}
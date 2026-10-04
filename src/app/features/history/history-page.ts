import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { QuizSession } from '../../core/models/quiz.models';
import { QuizService } from '../../core/services/quiz.service';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { QuizFlowService } from '../quiz/quiz-flow.service';

@Component({
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  selector: 'app-history-page',
  templateUrl: './history-page.html',
})
export class HistoryPage {
  private readonly data = inject(QuizService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly csv = inject(CsvExportService);
  private readonly flow = inject(QuizFlowService);
  private readonly router = inject(Router);

  readonly history = this.data.history;
  readonly masteredCount = computed(() => this.data.masteredIds().length);
  readonly toLearnCount = computed(() => Math.max(0, this.data.words().length - this.masteredCount()));
  readonly pending = signal(false);
  readonly message = signal('');
  readonly selectedHistoryId = signal('');
  readonly completedHistory = computed(() =>
    this.history().filter((attempt) => attempt.completedAt !== null),
  );
  readonly historyStats = computed(() => {
    const scores = this.completedHistory().map((attempt) => this.scoreFor(attempt));
    return {
      total: scores.length,
      average: scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
    };
  });

  scoreFor(quiz: QuizSession): number {
    return this.flow.scoreFor(quiz);
  }

  incorrectCount(quiz: QuizSession): number {
    return quiz.questions.filter((question) => question.isCorrect === false).length;
  }

  dateLabel(value: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  selectHistory(id: string): void {
    this.selectedHistoryId.update((current) => (current === id ? '' : id));
  }

  async startQuiz(): Promise<void> {
    this.message.set('');
    if (await this.flow.start()) {
      await this.router.navigateByUrl('/vocabulary/quiz');
    } else {
      this.message.set(this.flow.message());
    }
  }

  async resetProgress(): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Reset progress?',
      message: 'This will clear mastered words. Your quiz history will stay.',
      confirmLabel: 'Reset progress',
    });
    if (!confirmed) return;

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
    const confirmed = await this.confirmation.confirm({
      title: 'Clear all data?',
      message: 'This will permanently clear your quiz history and progress. This cannot be undone.',
      confirmLabel: 'Clear all',
    });
    if (!confirmed) return;

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

  exportReview(quiz: QuizSession): void {
    const rows = quiz.questions
      .filter((question) => question.isCorrect === false)
      .map((question) => [question.word, question.selectedAnswer ?? '', question.meaning, question.example]);
    this.csv.download(
      `vocab-review-${quiz.startedAt.slice(0, 10)}.csv`,
      ['Word', 'Your answer', 'Correct meaning', 'Example'],
      rows,
    );
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}
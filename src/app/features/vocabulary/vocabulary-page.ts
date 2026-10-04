import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { QuizService } from '../../core/services/quiz.service';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { QuizFlowService } from '../quiz/quiz-flow.service';

@Component({
  imports: [DecimalPipe, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule, RouterLink],
  selector: 'app-vocabulary-page',
  templateUrl: './vocabulary-page.html',
})
export class VocabularyPage {
  private readonly data = inject(QuizService);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(QuizFlowService);
  private readonly router = inject(Router);
  private readonly csv = inject(CsvExportService);

  readonly words = this.data.words;
  readonly masteredIds = this.data.masteredIds;
  readonly history = this.data.history;
  readonly learnerName = computed(() => {
    const displayName: unknown = this.auth.user()?.user_metadata['display_name'];
    return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Asaad';
  });
  readonly message = signal('');
  readonly masteredCount = computed(() => this.masteredIds().length);
  readonly toLearnCount = computed(() => Math.max(0, this.words().length - this.masteredCount()));
  readonly masteryPercent = computed(() =>
    this.words().length ? Math.round((this.masteredCount() / this.words().length) * 100) : 0,
  );
  readonly completedHistory = computed(() =>
    this.history().filter((attempt) => attempt.completedAt !== null),
  );

  async startQuiz(): Promise<void> {
    if (await this.flow.start()) await this.router.navigateByUrl('/vocabulary/quiz');
    else this.message.set(this.flow.message());
  }

  async downloadMistakes(): Promise<void> {
    const rows = this.completedHistory().flatMap((quiz) =>
      quiz.questions
        .filter((question) => question.isCorrect === false)
        .map((question) => [quiz.startedAt, question.word, question.selectedAnswer ?? '', question.meaning]),
    );
    this.csv.download('vocab-mistakes.csv', ['Quiz date', 'Word', 'Your answer', 'Correct meaning'], rows);
  }

  scoreFor(correctCount: number, questionCount: number): number {
    return questionCount ? Math.round((correctCount / questionCount) * 100) : 0;
  }

  incorrectCount(questions: { isCorrect: boolean | null }[]): number {
    return questions.filter((question) => question.isCorrect === false).length;
  }

  dateLabel(value: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { QuizFlowService } from './quiz-flow.service';

@Component({
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatRadioModule, MatTooltipModule],
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.html',
})
export class QuizPage implements OnInit {
  readonly flow = inject(QuizFlowService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    if (!this.flow.activeQuiz()) await this.router.navigateByUrl('/vocabulary');
  }

  leaveQuiz(): void {
    this.flow.stopExampleSpeech();
    void this.router.navigateByUrl('/vocabulary');
  }

  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  async nextQuestion(): Promise<void> {
    if (await this.flow.advance()) await this.router.navigateByUrl('/vocabulary/results');
  }
}
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { QuizFlowService } from './quiz-flow.service';

@Component({
  imports: [MatButtonModule, MatCardModule, MatExpansionModule, MatIconModule, RouterLink],
  selector: 'app-results-page',
  templateUrl: './results-page.html',
})
export class ResultsPage implements OnInit {
  readonly flow = inject(QuizFlowService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    if (!this.flow.activeQuiz()?.completedAt) await this.router.navigateByUrl('/vocabulary');
  }

  async takeAnotherQuiz(): Promise<void> {
    if (await this.flow.start()) await this.router.navigateByUrl('/vocabulary/quiz');
  }
}
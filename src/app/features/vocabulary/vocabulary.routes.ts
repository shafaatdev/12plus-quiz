import { Routes } from '@angular/router';

export const VOCABULARY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./vocabulary-page').then((module) => module.VocabularyPage),
  },
  {
    path: 'quiz',
    loadComponent: () => import('../quiz/quiz-page').then((module) => module.QuizPage),
  },
  {
    path: 'results',
    loadComponent: () => import('../quiz/results-page').then((module) => module.ResultsPage),
  },
  {
    path: 'history',
    loadComponent: () => import('../history/history-page').then((module) => module.HistoryPage),
  },
];
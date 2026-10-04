import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { QuizQuestion, QuizSession } from '../../core/models/quiz.models';
import { QuizService } from '../../core/services/quiz.service';

@Injectable({ providedIn: 'root' })
export class QuizFlowService implements OnDestroy {
  private readonly data = inject(QuizService);

  readonly activeQuiz = signal<QuizSession | null>(null);
  readonly questionIndex = signal(0);
  readonly selectedAnswer = signal('');
  readonly answerSubmitted = signal(false);
  readonly pending = signal(false);
  readonly message = signal('');
  readonly speakingExample = signal(false);
  readonly canSpeakExample = typeof window !== 'undefined' && 'speechSynthesis' in window;
  readonly currentQuestion = computed(
    () => this.activeQuiz()?.questions[this.questionIndex()] ?? null,
  );
  readonly progress = computed(() => {
    const quiz = this.activeQuiz();
    return quiz ? Math.round(((this.questionIndex() + 1) / quiz.questionCount) * 100) : 0;
  });
  readonly reviewQuestions = computed(
    () => this.activeQuiz()?.questions.filter((question) => question.isCorrect === false) ?? [],
  );

  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private preferredSpeechVoice: SpeechSynthesisVoice | null = null;
  private readonly handleVoicesChanged = (): void => this.updatePreferredSpeechVoice();

  constructor() {
    if (this.canSpeakExample) {
      this.updatePreferredSpeechVoice();
      window.speechSynthesis.addEventListener('voiceschanged', this.handleVoicesChanged);
    }
  }

  ngOnDestroy(): void {
    if (this.canSpeakExample) {
      window.speechSynthesis.removeEventListener('voiceschanged', this.handleVoicesChanged);
    }
    this.stopExampleSpeech();
  }

  async start(): Promise<boolean> {
    this.pending.set(true);
    this.message.set('');
    try {
      const quiz = await this.data.createQuiz();
      if (!quiz) {
        this.message.set('You have mastered every word. Reset progress to start again.');
        return false;
      }
      this.activeQuiz.set(quiz);
      this.questionIndex.set(0);
      this.selectedAnswer.set('');
      this.answerSubmitted.set(false);
      return true;
    } catch (error) {
      this.message.set(this.errorText(error));
      return false;
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
      this.activeQuiz.set(await this.data.recordAnswer(quiz.id, question, answer));
      this.answerSubmitted.set(true);
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  async advance(): Promise<boolean> {
    const quiz = this.activeQuiz();
    if (!quiz) return false;
    this.stopExampleSpeech();

    if (this.questionIndex() + 1 === quiz.questionCount) {
      this.pending.set(true);
      try {
        this.activeQuiz.set(await this.data.completeQuiz(quiz.id));
        return true;
      } catch (error) {
        this.message.set(this.errorText(error));
        return false;
      } finally {
        this.pending.set(false);
      }
    }

    this.questionIndex.update((index) => index + 1);
    this.selectedAnswer.set('');
    this.answerSubmitted.set(false);
    return false;
  }

  toggleExampleSpeech(example: string): void {
    if (!this.canSpeakExample) return;
    if (this.speakingExample()) {
      this.stopExampleSpeech();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(example);
    utterance.lang = 'en-GB';
    if (this.preferredSpeechVoice) utterance.voice = this.preferredSpeechVoice;
    utterance.onend = () => this.finishExampleSpeech(utterance);
    utterance.onerror = () => this.finishExampleSpeech(utterance);
    this.activeUtterance = utterance;
    this.speakingExample.set(true);
    window.speechSynthesis.speak(utterance);
  }

  stopExampleSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
    this.speakingExample.set(false);
  }

  scoreFor(quiz: QuizSession): number {
    return quiz.questionCount ? Math.round((quiz.correctCount / quiz.questionCount) * 100) : 0;
  }

  scoreMessage(): string {
    const quiz = this.activeQuiz();
    if (!quiz) return '';
    if (quiz.correctCount === quiz.questionCount) return 'Flawless round. Your focus is paying off.';
    if (quiz.correctCount >= 12) return 'Excellent work. Your vocabulary is getting stronger.';
    if (quiz.correctCount >= 8) return 'Good progress. Every round makes the next one easier.';
    return 'A solid start. Review the tricky words and keep going.';
  }

  private finishExampleSpeech(utterance: SpeechSynthesisUtterance): void {
    if (this.activeUtterance !== utterance) return;
    this.activeUtterance = null;
    this.speakingExample.set(false);
  }

  private updatePreferredSpeechVoice(): void {
    const englishVoices = window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const localEnglishVoices = englishVoices.filter((voice) => voice.localService);
    const candidateVoices = localEnglishVoices.length ? localEnglishVoices : englishVoices;
    const scoreVoice = (voice: SpeechSynthesisVoice): number => {
      const normalizedLanguage = voice.lang.toLowerCase().replace('_', '-');
      const qualityName = /natural|neural|premium|enhanced/i.test(voice.name);
      const providerName = /google|microsoft/i.test(voice.name);
      return (normalizedLanguage === 'en-gb' ? 100 : 50)
        + (qualityName ? 80 : 0)
        + (providerName ? 15 : 0);
    };

    this.preferredSpeechVoice = [...candidateVoices].sort(
      (first, second) => scoreVoice(second) - scoreVoice(first),
    )[0] ?? null;
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}
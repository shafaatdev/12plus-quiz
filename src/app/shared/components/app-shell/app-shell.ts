import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { QuizService } from '../../../core/services/quiz.service';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  imports: [MatButtonModule, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-shell',
  host: { '(document:keydown.escape)': 'closeMobileNavigation()' },
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly data = inject(QuizService);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly previewMode = !this.supabase.isConfigured;
  readonly mobileNavigationOpen = signal(false);
  readonly message = signal('');
  readonly learnerName = computed(() => {
    const displayName: unknown = this.auth.user()?.user_metadata['display_name'];
    return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Asaad';
  });
  readonly learnerInitial = computed(() => this.learnerName().charAt(0).toUpperCase());

  toggleMobileNavigation(): void {
    this.mobileNavigationOpen.update((isOpen) => !isOpen);
  }

  closeMobileNavigation(): void {
    this.mobileNavigationOpen.set(false);
  }

  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      this.data.words.set([]);
      this.data.masteredIds.set([]);
      this.data.history.set([]);
      await this.router.navigateByUrl('/auth');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    }
  }
}
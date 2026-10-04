import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { QuizService } from './core/services/quiz.service';
import { SupabaseService } from './core/services/supabase.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app-root.html',
})
export class AppRoot implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly data = inject(QuizService);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(true);
  readonly message = signal('');

  async ngOnInit(): Promise<void> {
    try {
      if (this.supabase.isConfigured) {
        await this.auth.initialize();
        if (this.auth.user()) {
          await this.data.refreshFromSupabase();
          if (this.router.url === '/auth') await this.router.navigateByUrl('/dashboard');
        } else {
          await this.router.navigateByUrl('/auth');
        }
      } else {
        await this.data.initializePreview();
        if (this.router.url === '/auth') await this.router.navigateByUrl('/dashboard');
      }
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to initialize the app.');
    } finally {
      this.loading.set(false);
    }
  }
}
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { QuizService } from '../../core/services/quiz.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule, RouterLink],
  selector: 'app-auth-page',
  templateUrl: './auth-page.html',
})
export class AuthPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly data = inject(QuizService);
  private readonly supabase = inject(SupabaseService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly displayNameValidator: ValidatorFn = (control) =>
    typeof control.value === 'string' && control.value.trim() ? null : { required: true };
  private readonly passwordsMatchValidator: ValidatorFn = (control) => {
    const password = control.parent?.get('password')?.value;
    if (!control.value || !password) return null;
    return control.value === password ? null : { passwordMismatch: true };
  };

  readonly message = signal('');
  readonly notice = signal('');
  readonly pending = signal(false);
  readonly isSignUp = signal(false);
  readonly authForm = this.formBuilder.nonNullable.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
  });

  ngOnInit(): void {
    this.authForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.authForm.controls.confirmPassword.updateValueAndValidity());
  }

  async submit(): Promise<void> {
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
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.message.set(this.errorText(error));
    } finally {
      this.pending.set(false);
    }
  }

  toggleMode(): void {
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

  private errorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!this.supabase.isConfigured) return 'Supabase is not configured.';
    return 'Something went wrong. Please try again.';
  }
}
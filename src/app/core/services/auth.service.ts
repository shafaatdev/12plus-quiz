import { Injectable, inject, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  readonly user = signal<User | null>(null);

  async initialize(): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    this.user.set(data.session?.user ?? null);

    client.auth.onAuthStateChange((_event, session) => {
      this.user.set(session?.user ?? null);
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = this.requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user.set(data.user);
  }

  async signUp(email: string, password: string, displayName: string): Promise<boolean> {
    const client = this.requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    this.user.set(data.session?.user ?? null);
    return Boolean(data.session);
  }

  async signOut(): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    this.user.set(null);
  }

  private requireClient() {
    if (!this.supabase.client) {
      throw new Error('Add your Supabase URL and publishable key to src/environments/environment.ts first.');
    }
    return this.supabase.client;
  }
}
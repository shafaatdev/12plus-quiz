import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly isConfigured = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);
  readonly client = this.isConfigured
    ? createClient(environment.supabaseUrl, environment.supabaseAnonKey)
    : null;
}
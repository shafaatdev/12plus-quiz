create table if not exists public.vocabularies (
  id bigint primary key,
  word text not null unique,
  meaning text not null,
  example text not null,
  options text[] not null check (cardinality(options) = 4)
);

create table if not exists public.user_word_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  vocabulary_id bigint not null references public.vocabularies (id) on delete cascade,
  mastered_at timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  question_count smallint not null check (question_count between 1 and 15),
  correct_count smallint not null default 0 check (correct_count between 0 and question_count)
);

create index if not exists quiz_attempts_user_started_idx
  on public.quiz_attempts (user_id, started_at desc);

create table if not exists public.quiz_questions (
  quiz_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_number smallint not null check (question_number between 1 and 15),
  vocabulary_id bigint not null references public.vocabularies (id),
  word text not null,
  meaning text not null,
  example text not null,
  options text[] not null check (cardinality(options) = 5),
  correct_answer text not null,
  selected_answer text,
  is_correct boolean,
  primary key (quiz_id, question_number)
);

alter table public.vocabularies enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_questions enable row level security;

create policy "Vocabulary is readable by everyone"
  on public.vocabularies for select
  using (true);

create policy "Users manage their own progress"
  on public.user_word_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own quiz attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage questions from their own quizzes"
  on public.quiz_questions for all
  using (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = quiz_questions.quiz_id
        and quiz_attempts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = quiz_questions.quiz_id
        and quiz_attempts.user_id = auth.uid()
    )
  );

grant select on public.vocabularies to anon, authenticated;
grant select, insert, update, delete on public.user_word_progress to authenticated;
grant select, insert, update, delete on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.quiz_questions to authenticated;
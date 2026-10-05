create table if not exists public.non_verbal_questions (
	question_id text primary key check (question_id ~ '^T[0-9]+-[0-9]+$'),
	correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D', 'E'))
);

create table if not exists public.user_non_verbal_progress (
	user_id uuid not null references auth.users (id) on delete cascade,
	question_id text not null references public.non_verbal_questions (question_id) on delete cascade,
	mastered_at timestamptz not null default now(),
	primary key (user_id, question_id)
);

create table if not exists public.non_verbal_quiz_attempts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	started_at timestamptz not null default now(),
	completed_at timestamptz,
	total_duration_ms bigint check (total_duration_ms is null or total_duration_ms >= 0),
	question_count smallint not null check (question_count between 1 and 10),
	correct_count smallint not null default 0 check (correct_count between 0 and question_count)
);

create index if not exists non_verbal_quiz_attempts_user_started_idx
	on public.non_verbal_quiz_attempts (user_id, started_at desc);

create table if not exists public.non_verbal_quiz_questions (
	quiz_id uuid not null references public.non_verbal_quiz_attempts (id) on delete cascade,
	question_number smallint not null check (question_number between 1 and 10),
	question_id text not null references public.non_verbal_questions (question_id),
	correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D', 'E')),
	selected_answer text check (selected_answer is null or selected_answer in ('A', 'B', 'C', 'D', 'E')),
	is_correct boolean,
	duration_ms bigint check (duration_ms is null or duration_ms >= 0),
	primary key (quiz_id, question_number),
	unique (quiz_id, question_id)
);

create index if not exists non_verbal_quiz_questions_question_idx
	on public.non_verbal_quiz_questions (question_id);

alter table public.non_verbal_questions enable row level security;
alter table public.user_non_verbal_progress enable row level security;
alter table public.non_verbal_quiz_attempts enable row level security;
alter table public.non_verbal_quiz_questions enable row level security;

create policy "Signed-in users can read NVR questions"
	on public.non_verbal_questions for select to authenticated
	using (true);

create policy "Users manage their own NVR progress"
	on public.user_non_verbal_progress for all to authenticated
	using ((select auth.uid()) = user_id)
	with check ((select auth.uid()) = user_id);

create policy "Users manage their own NVR attempts"
	on public.non_verbal_quiz_attempts for all to authenticated
	using ((select auth.uid()) = user_id)
	with check ((select auth.uid()) = user_id);

create policy "Users manage questions from their own NVR attempts"
	on public.non_verbal_quiz_questions for all to authenticated
	using (
		exists (
			select 1 from public.non_verbal_quiz_attempts as attempt
			where attempt.id = quiz_id
				and attempt.user_id = (select auth.uid())
		)
	)
	with check (
		exists (
			select 1 from public.non_verbal_quiz_attempts as attempt
			where attempt.id = quiz_id
				and attempt.user_id = (select auth.uid())
		)
	);

grant select on public.non_verbal_questions to authenticated;
grant select, insert, update, delete on public.user_non_verbal_progress to authenticated;
grant select, insert, update, delete on public.non_verbal_quiz_attempts to authenticated;
grant select, insert, update, delete on public.non_verbal_quiz_questions to authenticated;

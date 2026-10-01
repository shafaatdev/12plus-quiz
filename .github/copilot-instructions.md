# Project Instructions

## Project

**Daily Journal with Mood Tracker**

Stack:
- Vite
- Angular 22
- TypeScript
- SCSS
- Angular Material
- Supabase
- Supabase Auth

Follow applicable files under `.github/instructions/` for general engineering, TypeScript/Angular, styling, and design standards.

## Architecture

Use feature-based architecture with standalone Angular components.

```text id="hj8v3q"
src/app/
├── core/
│   ├── guards/
│   ├── models/
│   ├── services/
│   └── utils/
├── shared/
│   └── components/
├── features/
│   ├── auth/
│   ├── home/
│   ├── journal/
│   ├── mood/
│   └── profile/
└── app.routes.ts
```

- Keep feature-specific code inside its feature.
- Put application-wide infrastructure in `core/`.
- Put genuinely reusable UI in `shared/`.
- Preserve this architecture unless explicitly asked to change it.

## Supabase

Components must not call Supabase directly.

Use focused services such as:
- `AuthService`
- `JournalService`
- `MoodService`
- `ProfileService`

Keep Supabase implementation details inside the data/service layer and strongly type database operations.

Use Supabase Auth with:
- Email/password authentication
- Session persistence
- Authentication state
- Protected routes
- Route guards

Journal data must belong to the authenticated user.

Do not assume or silently modify Row Level Security policies. Client-side filtering is not a security boundary.

## Database Changes

When schema changes are required:

1. Propose the SQL migration first.
2. Explain the change and its purpose.
3. Identify possible impact on existing data.
4. Do not assume the migration has been applied.

Do not silently modify schemas, tables, columns, constraints, indexes, functions, triggers, or policies.

## Journal Domain

Support:
- Create, view, edit, and delete journals
- Search and filtering
- User-selectable journal dates
- Mood tracking
- Journal statistics and streaks

Default new entries to today's date while allowing another valid date.

Avoid duplicate entries for the same user/date when this is the established business rule.

Require confirmation before destructive journal actions.

Centralize mood definitions and metadata rather than duplicating them across features.

Keep statistics and streak calculations outside presentation code.

## Environment & Security

Use Angular environment files for environment-specific configuration.

Never expose or commit:
- Passwords
- Authentication tokens
- Private keys
- Supabase service-role keys
- Other secrets

Only frontend-safe Supabase configuration may exist in browser code.

Treat journal content as private user data and avoid logging sensitive journal/authentication information.

## Dependencies

Ask before adding, replacing, or upgrading npm dependencies.

First determine whether Angular, Angular Material, Supabase, browser APIs, or existing dependencies already solve the requirement.

Do not introduce additional UI frameworks or state-management libraries without approval.

## Copilot Behaviour

When implementing a request:

1. Inspect the existing implementation first.
2. Make the smallest complete change that satisfies the request.
3. Provide working code rather than pseudocode.
4. Preserve existing architecture and behaviour.
5. Mention required migrations or manual steps.
6. Ask before adding dependencies.
7. Avoid unrelated improvements or refactoring.

Prefer implementation first and concise explanation second.

If a requirement could materially affect architecture, schema, dependencies, security, or existing behaviour, ask before making a large assumption.
# 12plusQuiz

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Vocab Master

The app includes a 15-question vocabulary quiz, progress tracking, results review, quiz history, and CSV exports. Without Supabase credentials it runs in local preview mode and keeps progress in this browser's local storage.

### Application structure

The Angular app uses standalone feature pages with lazy-loaded routes. The root component initializes auth/data and hosts the router; the shared app shell owns navigation; feature folders own auth, dashboard, vocabulary, quiz/results, history, and non-verbal reasoning pages. Core services handle Supabase/auth/data, while shared services and components provide CSV export and confirmation dialogs. No NgModules are used.

### Supabase setup

1. Create a Supabase project and add its project URL and publishable key to `src/environments/environment.ts`. Keep the service-role key out of browser code and source control.
2. Review and apply `supabase/migrations/20260930000000_vocab_quiz.sql` to create the vocabulary, progress, quiz, and RLS policies. The migration is not applied automatically.
3. Copy `.env.example` to `.env`, then fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project. Import `public/vocabularies.json` after the migration by running `npm run import:vocabularies`. The `.env` file is git-ignored, and the service-role key is used only by this one-time Node script.
4. Run `npm start`. Account creation and sign-in use Supabase Auth; progress and quiz history are scoped to the signed-in user.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

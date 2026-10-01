---
applyTo: "**/*.ts"
---

# TypeScript & Angular Standards

## TypeScript

- Assume strict mode; never use `any`. Use precise types or `unknown` with narrowing.
- Handle `null` and `undefined` explicitly.
- Avoid unsafe assertions and non-null assertions unless correctness is guaranteed.
- Prefer inference internally and explicit types at public/API boundaries.
- Prefer `interface` for object contracts and `type` for unions/compositions.
- Use discriminated unions for states, results, and variants; handle them exhaustively.
- Prefer literal unions or `as const` objects over enums when practical.

## Immutability

- Prefer `readonly` data where mutation is unnecessary.
- Do not mutate function arguments or shared state.
- Produce updated objects/arrays instead of mutating existing values.

## Angular

- Use standalone components, `inject()`, and modern Angular APIs.
- Prefer `@if`, `@for`, and `@switch`.
- Use strongly typed Reactive Forms.
- Lazy-load feature routes where appropriate.
- Keep templates focused on presentation.
- Keep business logic and data access in focused services.
- Use route guards for navigation requirements, never as backend authorization.

## State Management

- Prefer Signals for application/UI state.
- Use `signal()` for writable state and `computed()` for derived state.
- Use `effect()` only for genuine side effects.
- Maintain a single source of truth and never mutate signal values in place.
- Use RxJS when Observables are the natural abstraction.

## Error & Async Handling

- Handle errors at the boundary best able to recover, translate, or present them.
- Use typed/discriminated results for expected success/failure outcomes when appropriate.
- Use exceptions for exceptional failures, not routine branching.
- Handle rejected promises and reset pending/loading state on failure.
- Use Angular lifecycle-safe mechanisms for subscription/resource cleanup.
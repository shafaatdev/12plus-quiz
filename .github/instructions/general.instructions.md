---
applyTo: "**/*"
---

# General Engineering Standards

## Naming & Structure

- Follow established language, framework, and repository conventions.
- Use clear, descriptive, intention-revealing names.
- Keep related code together and files focused on a clear responsibility.
- Avoid ambiguous abbreviations, unnecessary nesting, and premature abstractions.

## Readability

- Prefer simple, explicit code over clever solutions.
- Keep functions/modules focused and minimize unnecessary nesting.
- Avoid duplicated logic when extraction provides clear value.
- Replace meaningful unexplained literals with named constants.
- Optimize for maintainability rather than brevity.

## Comments

- Prefer self-documenting code.
- Comment only non-obvious decisions, business rules, constraints, and important workarounds.
- Explain why, not what the code already makes obvious.
- Do not leave stale or unnecessary TODO/FIXME comments.

## Refactoring

- Make the smallest change required for the task.
- Preserve existing behaviour unless explicitly changing it.
- Do not perform unrelated refactoring, renaming, cleanup, or formatting.
- Reuse established patterns before creating new abstractions.
- Suggest significant architectural changes separately.

## Error Handling

- Handle expected failures explicitly and never silently swallow errors.
- Provide safe, actionable errors while preserving useful diagnostic context.
- Never expose secrets or sensitive implementation details.
- Clean up temporary state/resources after failures.

## Imports & Formatting

- Keep imports explicit, organized, and free of unused entries.
- Avoid circular dependencies.
- Follow configured formatter and linter rules.
- Do not reformat unrelated code.

## Collaboration & Completion

- Keep changes focused, reviewable, and backward-compatible unless instructed otherwise.
- Clearly identify breaking changes, assumptions, migrations, and manual steps.
- Never commit secrets or sensitive data.
- Update relevant tests when behaviour changes.
- Remove dead/debug code, unused imports, placeholders, and accidental logging before completion.
- Ensure affected build, lint, formatting, and tests remain valid.
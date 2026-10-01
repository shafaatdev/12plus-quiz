---
applyTo: "**/*.scss"
---

# SCSS & Angular Material Standards

## SCSS Architecture & Organization
- Use `@use` and `@forward` module system rules instead of legacy `@import`.
- Keep the custom SCSS footprint minimal; leverage Angular Material design tokens first.
- Nest selectors max 2–3 levels deep to prevent high specificity and maintain clarity.
- Restrict `!important` exclusively to unavoidable third-party component overrides.

## Angular Material & Design System Integration
- Customize Angular Material components using official `@use '@angular/material' as mat;` mixins (e.g., `mat.all-component-themes`, `mat.button-theme`).
- Respect Material density, palette, and typography tokens across light and dark themes using CSS custom properties or Sass themes.
- Encapsulate component-specific Angular Material overrides in the component's SCSS file using `:host` or `::ng-deep` (strictly scoped to `:host`).
- Use Angular Material layout components (e.g., `<mat-card>`, `<mat-toolbar>`) instead of custom layout CSS.

## Class & Utility Organization
When mixing custom classes or applying `@apply` in SCSS, structure utility order systematically:
1. Layout & positioning (`absolute`, `sticky`, `z-index`)
2. Display, Flex, & Grid (`flex`, `grid`, `items-center`)
3. Sizing (`w-full`, `h-auto`, `max-w-screen-xl`)
4. Spacing (`p-4`, `m-2`, `gap-3`)
5. Typography (`font-sans`, `text-base`, `leading-relaxed`)
6. Backgrounds & Borders (`bg-surface`, `border`, `rounded-lg`)
7. Effects & Shadows (`shadow-md`, `opacity-90`)
8. Interaction states (`hover:`, `focus:`, `active:`)
9. Responsive variants (`md:`, `lg:`)
10. Dark-mode variants (`dark:`)

## Responsive & Layout Guidelines
- Maintain the project's desktop-first approach consistently across custom SCSS breakpoints.
- Avoid rigid pixel dimensions (`width`, `height`) on Material or custom containers that cause horizontal overflow.
- Ensure Angular Material containers scale gracefully on smaller viewport sizes.

## Accessibility & Interaction
- Ensure custom SCSS contrast ratios meet WCAG AA standards across light and dark Material themes.
- Preserve visible focus indicators on interactive custom elements and Material overrides (`:focus-visible`).
- Honor `prefers-reduced-motion` settings for non-essential SCSS animations and transitions.

## Custom SCSS Scope
Limit custom SCSS usage to scenarios not cleanly handled by Angular Material:
- Complex keyframe animations and multi-step transitions
- High-specificity Angular Material visual adjustments
- Specialized global or layout wrapper rules
- Complex pseudo-element styling (`::before`, `::after`)
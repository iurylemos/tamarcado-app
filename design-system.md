# Tamarcado Design System

## Tokens

The canonical color, typography, spacing, radius, and elevation values are defined in
`shared/domain/design-tokens.ts` and mirrored as CSS custom properties in each application's
`src/styles/design-tokens.css`.

| Token group | Guidance |
|---|---|
| Brand | Indigo for primary actions; teal for positive/success states |
| Neutral | Slate-based text and surfaces with clear contrast |
| Typography | System sans-serif stack; 1.5 body line-height |
| Spacing | 4px base scale (`space-1` through `space-12`) |
| Radius | 6px controls, 12px cards, pill only for status badges |
| Elevation | Subtle card shadow; avoid shadows as the only boundary cue |

## Component guidance

- Use semantic headings, buttons, labels, and forms; interactive targets must be keyboard operable.
- Keep component state explicit for loading, empty, success, validation, conflict, and unexpected errors.
- Prefer reusable atoms for buttons, cards, and status indicators, while keeping actor-specific flows
  within their own application.
- Use responsive single-column layouts on narrow screens and constrain reading width on desktop.
- Provide visible focus indicators, meaningful image alternative text, and status text that does not
  rely on color alone.

# Tamarcado project instructions

- Treat README.md and .specify/memory/constitution.md as project authorities; the constitution governs engineering decisions.
- For new features and significant behavior changes, follow the existing Spec Kit artifacts and workflow. Read the relevant spec.md, plan.md, and tasks.md before implementation.
- Do not invent scope or create parallel specs, plans, or task lists. Copilot owns Spec Kit artifact updates by default; Hermes works on explicitly assigned tasks or performs read-only review unless asked otherwise.
- Keep code in the responsible workspace: client, collaborator, backoffice, functions, or shared/domain. Keep shared domain logic independent of UI.
- Preserve tenant isolation, role-based authorization, Firebase security rules, booking integrity, and sensitive-data handling.
- Inspect existing code and tests before editing. Avoid unrelated changes.
- Run relevant tests and checks using the repository scripts; report only commands actually run and their results.
- Do not deploy, seed, import production data, or change Firebase production state without explicit authorization.

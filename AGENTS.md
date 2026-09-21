# CMS Project Engineering Guidelines

These rules are mandatory for every session in this codebase:

## 1. Graphify for Token Optimization
- **Always check for knowledge graph first**: When `graphify-out/graph.json` exists, use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` rather than reading raw files or performing wide greps.
- Read `graphify-out/wiki/index.md` before diving into raw source files.
- Run `graphify update .` after code modifications to keep the graph in sync.

## 2. Git Tracking & Commits
- Track all code changes in Git.
- Commit after each logical unit of work; never leave uncommitted changes at session close.
- Follow **Conventional Commits** scoped by domain (e.g., `feat(auth): ...`, `fix(schema): ...`, `refactor(content): ...`).
- Never commit `.env` (maintain `.env.example` only).

## 3. Branch Management
- Perform initial project scaffolding on `main`.
- Immediately after initial setup commit, branch off to `dev`. All development and feature work must happen on `dev` (or short-lived `feat/*` branches merged into `dev`).
- `main` is protected and only receives tested, verified phase completions.

## 4. Code Quality & Readability
- Follow clean code practices: meaningful naming conventions, clear formatting (ESLint + Prettier).
- Add brief JSDoc comments explaining module and service responsibilities.
- Keep files compact (under ~200 lines where practical); break oversized files into dedicated sub-components or helpers.

## 5. Modularity & DRY (Don't Repeat Yourself)
- Separate concerns strictly: Controllers handle HTTP/transport, Services handle business logic, Guards/Pipes handle validation and access control.
- Centralize shared types in `libs/shared-types/` to prevent duplication between client and server.
- Extract recurring routines (pagination, response envelope, filtering) into shared utilities.

---
For detailed architecture, data models, and the 9-phase roadmap, refer to `.agents/skills/cms-headless/SKILL.md` and `.agents/skills/cms-headless/references/system-design.md`.

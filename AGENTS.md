# Repository Guidelines

## Project Structure & Module Organization
Mediator Pro is split by runtime. The Vite client lives in `client/`, with feature routes under `client/src/pages`, reusable view primitives in `client/src/components`, hook logic in `client/src/hooks`, and shared helpers in `client/src/lib`. The Express API is in `server/`; `server/index.ts` boots the app, `server/routes.ts` wires HTTP handlers, and service files (`aiService.ts`, `emailService.ts`, `zoomService.ts`, etc.) encapsulate integrations. `shared/schema.ts` holds Drizzle models used on both sides through the `@shared/*` path alias. Generated bundles land in `dist/` and uploaded assets in `uploads/`.

## Build, Test, and Development Commands
Use `npm run dev` to run both Vite and the TypeScript API via `tsx`. `npm run build` creates production artifacts (Vite front-end build plus an esbuild bundle for `server/index.ts`). Use `npm run start` to launch the bundled server from `dist/`. Database migrations and schema pushes run with `npm run db:push` (Drizzle). Type-level safety is enforced with `npm run check` which executes `tsc --noEmit`.

## Coding Style & Naming Conventions
Follow the existing TypeScript style: 2-space indentation, semicolons, single quotes, and dangling commas on multi-line literals. Component files live in PascalCase (`Home.tsx`), hooks in camelCase (`useAuth.ts`), and shared types or schemas in `PascalCase`. Import client code with `@/` and cross-cutting utilities with `@shared/`. Prefer functional React components with hooks and validate inputs using Zod before persisting.

## Testing Guidelines
The repo expects automated coverage even though no suite is committed yet. Add feature tests alongside the code—e.g., `client/src/__tests__/` for UI (Vitest + React Testing Library) and `server/__tests__/` for API flows (Supertest). Update `package.json` to expose the tests via `npm test` so contributors can run them consistently, and keep Drizzle migrations plus seed data deterministic.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) and keep messages scoped to one change. Every PR should include: a concise summary of intent, linked issues, screenshots or JSON samples for UI/API updates, notes on environment or schema changes, and confirmation that `npm run check`, the test suite, and `npm run build` succeed locally. Request review only after addressing lint/type warnings; maintainers block merges on failing checks.

## Security & Configuration Tips
Never commit secrets—use `.env` and provide sample values in `.env.example`. Sanitise uploads before long-term storage by reusing the patterns in `server/localFileStorage.ts`. When adding providers or credentials, centralise logic in `server/*Service.ts` and document configuration steps in `Install.md` so operators can replicate them safely.

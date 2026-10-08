# Deployment constraints

This app deploys on Vercel Hobby, which allows at most 12 serverless functions per deployment. Keep headroom below that limit.

- Add future Operations/Notes endpoints as handlers in `api/_lib/`, registered in `api/operations.js`, with explicit rewrites in `vercel.json`. Do not add a separate deployable API file for each feature.
- Preserve existing public API URLs, authentication, role checks and local Vite API routing when grouping handlers.
- Run `node --test tests/vercel-routing.test.mjs` after API/routing changes. It checks the function count and grouped routes.
- Ignore unrelated local `.claude/settings.local.json` and temporary `tmp/skill-validator-deps` changes when staging commits.

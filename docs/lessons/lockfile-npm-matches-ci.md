---
type: Lesson
title: Write the lockfile with the npm that CI runs
description: An older local npm can leave optional dependencies out of package-lock.json, and the runner's newer npm ci then refuses it.
tags: [npm, ci, lockfile]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-09T16:45:00Z }
sources:
  - id: run
    resource: GitHub Actions run 42656515034 (npm ci, EUSAGE, Missing pg@8.23.1)
  - id: fix
    resource: commit merged in 5daa31c (lockfile regenerated with npm 11.19.1)
---

# Context
The first CI run failed at `npm ci`: "Missing: pg@8.23.1 from lock file". The lockfile had been written by npm 11.6.2 locally, which left out EmDash's optional `pg`; the runner's Node 24.22 brings npm 11.19.1, which requires it. Local `npm ci` passed, so nothing local showed the problem.[^run]

# Lesson
Treat the npm on the CI runner as the one that decides whether the lockfile is valid. When dependencies change, write the lockfile with that npm, not whichever one is installed locally.[^fix]

# How to apply
- Check the runner's npm in the setup-node step of a recent CI log (`npm: 11.x.y`).
- Regenerate with it: `npx -y npm@<that version> install --package-lock-only`, then `npx -y npm@<that version> ci` and `npm run check` before committing.
- `publish.yml` pins its own npm for trusted publishing; keep that pin at or above the runner's npm.

[^run]: The failed CI run
[^fix]: The lockfile fix

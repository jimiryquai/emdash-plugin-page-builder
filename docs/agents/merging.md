# Merging: Local

Merges for this repository run locally on `master` in the main checkout and are pushed to `origin` (GitHub). There are no pull requests, so the gate is [review.md](review.md): for a high-tier branch, wait for James's approval before **Merge**. Record the tier, its reason and any cross-family review in the ticket and the run report.

## Open a review

No pull request is opened: confirm the helper's branch is pushed (`git rev-parse --verify origin/<branch>` matches the branch head). Done when the pushed ref is confirmed on the remote.

## Wait for checks

There is no CI yet. The orchestrator runs `rm -rf dist && npm ci && npm run check` on the merged tree in **Merge**, exactly as written. Removing `dist/` matters: the package imports its own built entry, so a leftover build hides a broken build order (ticket 03's first merge passed in the helper's worktree on a stale `dist/` and failed from clean). Ask helpers for the same clean run as evidence. If a check fails on the merged tree, reset `master` to its pre-merge commit and send the failed run back to the helper as a fix round. Done when `npm run check` passes on the merged tree.

## Merge

On `master` in the main checkout: `git merge --no-ff <branch>`, then `rm -rf dist && npm ci && npm run check` on the merged tree, then `git push origin master`. Afterwards delete the branch locally and on `origin`. Done when the `--no-ff` merge commit has passed `npm run check` and `master` is pushed.

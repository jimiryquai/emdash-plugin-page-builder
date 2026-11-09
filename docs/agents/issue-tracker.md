# Issue tracker: Local Markdown

Tickets are markdown files under `.scratch/<effort>/issues/`. Use the local-issue-tracker skill (`~/.agents/skills/local-issue-tracker/SKILL.md`) for the ticket format and its `tickets.mjs` for every operation. Run commands from this repository's main checkout, never a worktree's copy, so claims reach every helper.

The current effort is `v1` (spec: [docs/specs/v1-page-builder.md](../specs/v1-page-builder.md)).

## Read an issue

`cat .scratch/<effort>/issues/<file>.md`, using the path that `ready` returns.

## Publish a ticket

`node ~/.agents/skills/local-issue-tracker/tickets.mjs new --effort <effort> --title "<title>"`, then fill in the returned file and set its status to `ready-for-agent`. Blockers use full ticket IDs (`03-48a1daa0`).

## Find ready work

`node ~/.agents/skills/local-issue-tracker/tickets.mjs ready`. Fix any reported `errors` before trusting the list.

## Claim a ticket

`node ~/.agents/skills/local-issue-tracker/tickets.mjs claim <id>` before starting work.

## Comment

Append under the ticket's `## Comments`, starting `**YYYY-MM-DD Author:**`.

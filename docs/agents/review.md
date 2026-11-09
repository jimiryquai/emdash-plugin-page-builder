# Review policy

This file holds policy; the orchestrate skill owns the process and [merging.md](merging.md) owns enforcement. Merges are local (no pull requests), so approval below means James's explicit go-ahead in the session, recorded in the ticket's comments.

## Risk tiers

Blast radius decides; the highest matching tier wins and uncertainty raises it. CI definition and branch-policy changes are always high.

| Tier | Criteria in this repo | Review required |
|---|---|---|
| Low | Reference docs (`docs/research/`, glossary wording), tracker edits, explainers, tests that only add coverage | Repo checks and orchestrator review; orchestrator merges |
| Medium | Package code (`src/`), block definitions with compatible changes, shapes, the block layer, build and packaging config, `AGENTS.md`, `CODING_STANDARDS.md`, `docs/agents/`, specs and ADRs | Repo checks, the `code-review` skill (Standards and Spec) and orchestrator review; orchestrator merges |
| High | Anything that writes to a live EmDash site (the apply CLI's `--apply`, `--activate` and `--migrate` paths), a breaking block version or its migration, changes in another repo (jamesryan-sites) or to production content, publishing to npm, CI definitions | Everything for medium, plus a saved review by a model family different from the builder's, plus James's approval before merge |

## Approvers

- Medium: the orchestrator, once its own checks and the `code-review` findings are settled.
- High: James Ryan (james@jamesryan.dev), after the cross-family review evidence is saved.

## Where to look hardest

- **One home per fact:** a block's fields, versions, variants and description live only in its block-type module; the CLI, the block layer and tests read them from there ([CODING_STANDARDS.md](../../CODING_STANDARDS.md) rule 3).
- **Site knowledge leaking into the package:** collection names, the `services` grouping or `@jamesryan/ui` appearing in `src/` ([ADR 0001](../adr/0001-package-owns-data-sites-own-collections-and-visuals.md)).
- **Schema safety:** a change that removes a field, changes a type, adds a required field or narrows validation is breaking and needs a new version plus a migration that keeps `_key`; a removed variant is breaking ([ADR 0002](../adr/0002-fixed-variant-vocabulary.md)).
- **The packed package:** tests that pass against `src/` but not the packed `exports`, and `.astro` files missing from the tarball.
- **Live writes:** the CLI writes only with `--apply`, and tests never reach a real site.
- Recurring defects: search [docs/lessons/](../lessons/) (once it exists) for the touched areas.

## What to ignore

- `package-lock.json` churn beyond the dependencies the diff names, and `dist/`.
- Formatting a formatter would settle, and wording preferences in docs that don't change a rule or a fact.

## How to report

Report each actionable finding with severity, file and line, the concrete failure and evidence, and the suggested correction. Separate Standards from Spec findings and state explicitly when either has none. Record the reviewed commit, builder and reviewer model families, and the evidence path for a high-tier cross-family review.

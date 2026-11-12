# Lessons log

## 2026-11-12

* **Creation**: Authenticated content GET hydrates a pending draft into item.data (caught independently in tickets v1/14 and v1/28 live-site migration reviews).

* **Update**: Block fields are optional so a new block autosaves (added EmDash 1.5 `url: ""` draft rejection from ticket v1/25's browser spike; updated ticket 19 reference to shipped `./plugin` hook).

## 2026-11-10

* **Creation**: Block fields are optional so a new block autosaves (from ticket v1/18's local-site failure; required to publish comes in ticket 19, ADR 0003).

## 2026-11-09

* **Creation**: Write the lockfile with the npm that CI runs (first CI run failed on a lockfile from npm 11.6.2).

* **Creation**: Validate block definitions with EmDash's own validateSeed (from ticket 08's first adoption run and ticket 15).

* **Creation**: EmDash decides whether a block type change is breaking (from ticket v1/02's Spec review).

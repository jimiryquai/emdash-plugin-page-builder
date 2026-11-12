---
type: Lesson
title: Authenticated content GET hydrates a pending draft into item.data
description: When a published EmDash entry has draftRevisionId set, GET /_emdash/api/content/<col>/<id> returns the pending draft in item.data and the published columns in item.liveData, so migration scripts must classify pending drafts and verify full read-backs before publishing.
tags: [emdash, content-api, migrations]
generated: { by: agy/gemini-4-carbon, at: 2026-11-12T18:50:00Z }
sources:
  - id: retire
    resource: https://github.com/jimiryquai/jamesryan-sites/pull/33 (ticket 14 retirement safety fix)
  - id: home-posts
    resource: https://github.com/jimiryquai/jamesryan-sites/pull/36 (ticket 28 add-home-posts-block Fix Round 1)
---

# Context
Two separate live-site layout migration scripts (`retire-pages-content.mjs` in ticket 14 and `add-home-posts-block.mjs` in ticket 28) initially treated `item.data` from `GET /_emdash/api/content/pages/<id>` as the live published entry whenever `item.status === "published"`. In EmDash 1.5, privileged `GET` runs `hydrateDraftData`: when a published entry has a pending draft (`item.draftRevisionId !== null`), `item.data` holds the **draft** revision and `item.liveData` holds the **published** columns. Treating `item.data` as live caused two hazards: (1) `PUT` + `POST .../publish` published an editor's unreviewed draft onto the live page, and (2) if `PUT` succeeded and `POST .../publish` failed transiently, a rerun saw its own staged draft in `item.data` and exited `"unchanged"` while `item.liveData` remained unmigrated.

# Lesson
Classify pending drafts against `item.liveData` before mutating or publishing a `status === "published"` entry over EmDash's content REST API, and verify the entire read-back before calling `POST .../publish`.[^retire][^home-posts]

# How to apply
- When `item.status === "published"` and `item.draftRevisionId` is truthy:
  - Refuse to write or publish if `item.liveData` is missing or if `item.data` contains any edit other than the exact migration output computed from `item.liveData` (exit `0` in plan mode, `1` under `--apply`).
  - If `item.data` already equals `{ ...item.liveData, ...plannedPatch }`, treat the entry as a retry of an interrupted publish and call `POST .../publish` with `current._rev` without issuing a redundant `PUT`.
- After `PUT` (with `_rev`), read the entry back and verify both `item.data` (all fields, not just `layout`) and `item.liveData` match the planned write before passing the read-back's `_rev` to `POST .../publish`, so a concurrent edit between `PUT` and `GET` is never adopted and published.

[^retire]: Ticket 14 concurrent-edit and pending-draft safety fix (`jimiryquai/jamesryan-sites#33`)
[^home-posts]: Ticket 28 Home `posts` migration script Fix Round 1 (`jimiryquai/jamesryan-sites#36`)

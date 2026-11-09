/**
 * Types for the apply CLI.
 *
 * Domain types have one home each: stored blocks and block modules come from
 * the package's blocks core (`../blocks/core.js`), field and definition
 * shapes come from `emdash` (CODING_STANDARDS.md rule 3). Only what the CLI
 * itself owns lives here: the remote site's report shapes and the plan.
 */

import type { BlockFieldDefinition } from "emdash";
import type { BlockType, StoredBlock } from "../blocks/core.js";

/** A block type definition in EmDash's seed shape (a module's `definition`). */
export type BlockTypeDefinition = BlockType["definition"];

/** One version of a block type, as the seed shape declares it. */
export type BlockTypeVersionDefinition = BlockTypeDefinition["versions"][number];

/** A block module: `definition` beside variants, migrations, sections. */
export type BlockModule = BlockType;

/** What a site reports for one stored block type version. */
export interface RemoteBlockTypeVersion {
	version: number;
	fields: BlockFieldDefinition[];
	fingerprint: string;
	active: boolean;
}

/** What a site reports for one stored block type (GET /schema/block-types). */
export interface RemoteBlockType {
	id: string;
	slug: string;
	label: string;
	description?: string | null;
	icon?: string | null;
	category?: string | null;
	currentVersion: number;
	source: string;
	versions: RemoteBlockTypeVersion[];
}

/** What a site reports for one collection field. */
export interface RemoteField {
	id: string;
	slug: string;
	label: string;
	type: string;
	required: boolean;
	validation: Record<string, unknown> | null;
	[key: string]: unknown;
}

/** What a site reports for one collection (with fields, when requested). */
export interface RemoteCollection {
	id: string;
	slug: string;
	label: string;
	[key: string]: unknown;
	fields?: RemoteField[];
}

/** What the plan would do for one block type version (or one side action). */
export type PlanActionKind = "create" | "update" | "activate" | "migrate" | "unchanged";

export interface PlanAction {
	blockType: string;
	/** Target version, or null for actions that are not per-version. */
	version: number | null;
	action: PlanActionKind;
	/** Extra locating detail: why, what, where. */
	detail?: string;
	/** Set once an attempt was made. */
	result?: "done" | "skipped";
	/** True when activation is part of a brand-new type's create (needs no --activate). */
	autoActivate?: boolean;
}

export interface PlanCounts {
	create: number;
	update: number;
	activate: number;
	migrate: number;
	unchanged: number;
}

export interface Plan {
	actions: PlanAction[];
	counts: PlanCounts;
	/** Problems the CLI will not act on: the site holds a contract it cannot express. */
	warnings: string[];
	/** Definition errors: with any, the CLI writes nothing, not even with --apply. */
	errors: string[];
}

export type { BlockFieldDefinition, StoredBlock };

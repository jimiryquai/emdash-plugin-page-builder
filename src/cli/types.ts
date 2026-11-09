/**
 * Types for the apply CLI.
 *
 * A block type definition follows EmDash's own seed `blockTypes` shape (see
 * .orchestrate/evidence/api-contract.md): the CLI takes an array of them as
 * input and never invents another format. Block modules may carry extra keys
 * (migrations, variants, sections) beside `definition`; the CLI reads only the
 * definition.
 */

/** One field of one block type version, as EmDash's API accepts it. */
export interface BlockFieldDefinition {
	slug: string;
	label: string;
	type: string;
	required?: boolean;
	defaultValue?: unknown;
	validation?: Record<string, unknown> | null;
	options?: Record<string, unknown>;
}

/** One version of a block type. Versions are contiguous integers from 1. */
export interface BlockTypeVersionDefinition {
	version: number;
	fields: BlockFieldDefinition[];
}

/** A block type definition in EmDash's seed shape. */
export interface BlockTypeDefinition {
	slug: string;
	label: string;
	description?: string;
	icon?: string;
	category?: string;
	currentVersion: number;
	versions: BlockTypeVersionDefinition[];
}

/** A block module: its `definition` plus keys the CLI ignores. */
export interface BlockModule {
	definition: BlockTypeDefinition;
	[key: string]: unknown;
}

/** Either shape is accepted as CLI input. */
export type BlockTypeInput = BlockTypeDefinition | BlockModule;

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

/** A stored block as it sits in a content entry's blocks field. */
export interface StoredBlock {
	_type: string;
	_version: number;
	_key: string;
	[key: string]: unknown;
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
}

/**
 * Execute a plan against a site: create, update, activate, then migrate
 * stored blocks — in EmDash's order (create inactive, activate on request,
 * migrate last).
 */

import { migrateBlocks, type BlockType } from "../blocks/core.js";
import type { EmdashClient, ContentEntry } from "./client.js";
import type {
	BlockTypeDefinition,
	Plan,
	RemoteBlockType,
	StoredBlock,
} from "./types.js";

export interface ApplyOptions {
	/** Perform the plan; without it nothing is written. */
	apply: boolean;
	/** Activate breaking versions (the renderer is deployed). */
	activate: boolean;
	/** Move stored blocks to the active version, preserving `_key`. */
	migrate: boolean;
}

function activeFingerprint(type: RemoteBlockType): string {
	const active = type.versions.find((version) => version.version === type.currentVersion);
	if (!active) throw new Error(`Block type ${type.slug} has no version ${type.currentVersion}`);
	return active.fingerprint;
}

/**
 * Perform every create/update/activate action the flags allow.
 *
 * EmDash creates one breaking version per PUT, so versions are created in
 * ascending order, each PUT carrying the *active* version's fingerprint.
 * Breaking-ness is EmDash's decision (`compareBlockFields`): a compatible
 * change updates the active version in place even when `breaking: true` is
 * sent, so each PUT's response is checked — if version N didn't appear, the
 * definition declared a version that isn't breaking against its predecessor
 * and must be folded into it.
 *
 * A brand-new type's own `currentVersion` is activated as part of its
 * create (no stored blocks can exist for it); later activations need
 * `--activate`.
 */
export async function executePlan(
	client: EmdashClient,
	plan: Plan,
	blockTypes: readonly BlockType[],
	options: ApplyOptions,
): Promise<Plan> {
	if (!options.apply) {
		for (const action of plan.actions) if (action.action !== "unchanged") action.result = "skipped";
		return plan;
	}

	const definitions = new Map(blockTypes.map((block) => [block.definition.slug, block.definition]));
	const remote = await client.listBlockTypes();
	let remoteBySlug = new Map(remote.items.map((type) => [type.slug, type]));

	for (const action of plan.actions) {
		const definition = definitions.get(action.blockType);
		if (!definition) continue;

		if (action.action === "create" && action.version !== null) {
			const current = remoteBySlug.get(action.blockType);
			if (!current) {
				const created = await client.createBlockType({
					slug: definition.slug,
					label: definition.label,
					description: definition.description,
					icon: definition.icon,
					category: definition.category,
					fields: versionFields(definition, 1),
				});
				remoteBySlug = republish(remoteBySlug, created);
				action.result = "done";
				continue;
			}
			// A later version: one breaking PUT per version, in order.
			const updated = await client.updateBlockType(
				definition.slug,
				{
					expectedFingerprint: activeFingerprint(current),
					fields: versionFields(definition, action.version),
					breaking: true,
				},
				action.version,
			);
			if (!updated.versions.some((version) => version.version === action.version)) {
				throw new Error(
					`${definition.slug} v${action.version} is not a breaking change against v${action.version - 1} ` +
						`(EmDash updated v${updated.currentVersion} in place); fold it into that version`,
				);
			}
			remoteBySlug = republish(remoteBySlug, updated);
			action.result = "done";
			continue;
		}

		if (action.action === "update" && action.version !== null) {
			const current = remoteBySlug.get(action.blockType);
			if (!current) continue;
			const updated = await client.updateBlockType(
				definition.slug,
				{
					expectedFingerprint: activeFingerprint(current),
					fields: versionFields(definition, action.version),
				},
				action.version,
			);
			remoteBySlug = republish(remoteBySlug, updated);
			action.result = "done";
			continue;
		}

		if (action.action === "activate" && action.version !== null) {
			if (!action.autoActivate && !options.activate) {
				action.result = "skipped";
				continue;
			}
			const current = remoteBySlug.get(action.blockType);
			if (!current) continue;
			const activated = await client.activateBlockTypeVersion(
				definition.slug,
				action.version,
				activeFingerprint(current),
			);
			remoteBySlug = republish(remoteBySlug, activated);
			action.result = "done";
			continue;
		}

		if (action.action === "unchanged") action.result = "skipped";
	}

	return plan;
}

function republish(
	bySlug: Map<string, RemoteBlockType>,
	type: RemoteBlockType,
): Map<string, RemoteBlockType> {
	const next = new Map(bySlug);
	next.set(type.slug, type);
	return next;
}

function versionFields(definition: BlockTypeDefinition, version: number): unknown[] {
	const declared = definition.versions.find((candidate) => candidate.version === version);
	if (!declared) throw new Error(`${definition.slug} declares no version ${version}`);
	return declared.fields;
}

/** The page size the migration scan reads content with. */
const PAGE_SIZE = 100;

/** A stored block is stale when its type is one of ours and below the version we target. */
export function isStale(
	block: StoredBlock,
	targets: ReadonlyMap<string, number>,
): boolean {
	const target = targets.get(block._type);
	return target !== undefined && typeof block._version === "number" && block._version < target;
}

export interface PendingMigration {
	collection: string;
	entryId: string;
	field: string;
	blocks: StoredBlock[];
	rev?: string;
	/** The modules whose stored blocks this entry holds below their target. */
	targetVersions: Map<string, number>;
}

export interface MigrationScan {
	pending: PendingMigration[];
	/** Types whose migration waits for --activate (the target isn't active yet). */
	warnings: string[];
}

/**
 * Find stored blocks of the given types that sit below the version the site
 * can migrate to. EmDash only accepts a `_version` change to the type's
 * **active** version, so the target is the site's active version where it
 * matches the definition's `currentVersion`; anything else is reported as a
 * warning, not a pending migration.
 */
export async function findPendingMigrations(
	client: EmdashClient,
	blockTypes: readonly BlockType[],
	remote: readonly RemoteBlockType[],
): Promise<MigrationScan> {
	const warnings: string[] = [];
	const targets = new Map<string, number>();
	for (const block of blockTypes) {
		const site = remote.find((type) => type.slug === block.definition.slug);
		if (!site) continue;
		if (site.currentVersion !== block.definition.currentVersion) {
			warnings.push(
				`${block.definition.slug}: stored blocks wait on --activate (site active v${site.currentVersion}, definition v${block.definition.currentVersion})`,
			);
			continue;
		}
		if (site.versions.some((version) => version.version < site.currentVersion)) {
			targets.set(block.definition.slug, site.currentVersion);
		}
	}

	const pending: PendingMigration[] = [];
	if (targets.size === 0) return { pending, warnings };

	const collections = await client.listCollections();
	for (const collection of collections.items) {
		const blockFields = (collection.fields ?? []).filter((field) => field.type === "blocks");
		if (blockFields.length === 0) continue;

		let page = 1;
		for (;;) {
			const result = await client.listContent(collection.slug, page, PAGE_SIZE);
			for (const entry of result.items) {
				for (const field of blockFields) {
					const value = entry.data?.[field.slug];
					if (!Array.isArray(value)) continue;
					const stale = (value as StoredBlock[]).filter((block) => isStale(block, targets));
					if (stale.length === 0) continue;
					pending.push({
						collection: collection.slug,
						entryId: entry.id,
						field: field.slug,
						blocks: value as StoredBlock[],
						rev: entry._rev,
						targetVersions: targets,
					});
				}
			}
			if (result.items.length < PAGE_SIZE) break;
			page += 1;
		}
	}

	return { pending, warnings };
}

/**
 * Move each pending entry's stale blocks up the package's own migration
 * chain (`migrateBlocks` from the blocks core — the same functions that
 * upgrade at render time), then write the result back with EmDash's
 * `migrateBlocks: true`, carrying the entry's `_rev` so a lost update
 * surfaces as a conflict. `_key` is preserved by the chain; sibling blocks
 * of other types pass through untouched.
 */
export async function migrateStoredBlocks(
	client: EmdashClient,
	pending: readonly PendingMigration[],
	blockTypes: readonly BlockType[],
): Promise<void> {
	const relevant = blockTypes.filter((block) =>
		pending.some((item) => item.targetVersions.has(block.definition.slug)),
	);
	for (const item of pending) {
		let migrated: StoredBlock[];
		try {
			migrated = migrateBlocks(item.blocks, relevant);
		} catch (error) {
			throw new Error(
				`migrating ${item.collection}/${item.entryId}.${item.field}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		await client.migrateEntryBlocks(item.collection, item.entryId, {
			[item.field]: migrated,
		}, item.rev);
	}
}

export type { ContentEntry };

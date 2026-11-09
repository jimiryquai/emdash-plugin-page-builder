/**
 * Execute a plan against a site: create, update, activate, then migrate
 * stored blocks — in EmDash's order (create inactive, activate on request,
 * migrate last).
 */

import type { EmdashClient, ContentEntry } from "./client.js";
import type { BlockTypeDefinition, Plan, PlanAction, RemoteBlockType, StoredBlock } from "./types.js";

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
 * A brand-new type's own `currentVersion` is activated as part of its
 * create (no stored blocks can exist for it); later activations need
 * `--activate`.
 */
export async function executePlan(
	client: EmdashClient,
	plan: Plan,
	definitions: readonly BlockTypeDefinition[],
	options: ApplyOptions,
): Promise<Plan> {
	if (!options.apply) {
		for (const action of plan.actions) if (action.action !== "unchanged") action.result = "skipped";
		return plan;
	}

	const bySlug = new Map(definitions.map((definition) => [definition.slug, definition]));
	const remote = await client.listBlockTypes();
	let remoteBySlug = new Map(remote.items.map((type) => [type.slug, type]));

	for (const action of plan.actions) {
		const definition = bySlug.get(action.blockType);
		if (!definition) continue;

		if (action.action === "create" && action.version !== null) {
			const current = remoteBySlug.get(action.blockType);
			if (!current) {
				const first = versionFields(definition, 1);
				const created = await client.createBlockType({
					slug: definition.slug,
					label: definition.label,
					description: definition.description,
					icon: definition.icon,
					category: definition.category,
					fields: first,
				});
				remoteBySlug = republish(remoteBySlug, created);
				action.result = "done";
				continue;
			}
			// A later version: one breaking PUT per version, in order.
			const expected = activeFingerprint(current);
			const fields = versionFields(definition, action.version);
			const updated = await client.updateBlockType(
				definition.slug,
				{ expectedFingerprint: expected, fields, breaking: true },
				action.version,
			);
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
			const detail = action.detail ?? "";
			const newType = detail.includes("new block type");
			if (!newType && !options.activate) {
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

/**
 * Find stored blocks of the given types that sit below their definition's
 * current version. Returns one pending migration per (collection, entry).
 */
export interface PendingMigration {
	collection: string;
	entryId: string;
	field: string;
	blocks: StoredBlock[];
	targetVersions: Map<string, number>;
}

export async function findPendingMigrations(
	client: EmdashClient,
	definitions: readonly BlockTypeDefinition[],
): Promise<PendingMigration[]> {
	const targets = new Map(definitions.map((definition) => [definition.slug, definition.currentVersion]));
	const collections = await client.listCollections();
	const pending: PendingMigration[] = [];

	for (const collection of collections.items) {
		const blockFields = (collection.fields ?? []).filter((field) => field.type === "blocks");
		if (blockFields.length === 0) continue;

		let page = 1;
		for (;;) {
			const result = await client.listContent(collection.slug, page);
			for (const entry of result.items) {
				for (const field of blockFields) {
					const value = entry.data?.[field.slug];
					if (!Array.isArray(value)) continue;
					const stale = (value as StoredBlock[]).filter(
						(block) =>
							targets.has(block._type) &&
							typeof block._version === "number" &&
							block._version < (targets.get(block._type) ?? 0),
					);
					if (stale.length === 0) continue;
					pending.push({
						collection: collection.slug,
						entryId: entry.id,
						field: field.slug,
						blocks: value as StoredBlock[],
						targetVersions: targets,
					});
				}
			}
			if (result.items.length < 100) break;
			page += 1;
		}
	}

	return pending;
}

/**
 * Move each pending entry's stale blocks to the definition's current version
 * through EmDash's `migrateBlocks` write. `_key` and the other blocks in the
 * field are left exactly as stored.
 */
export async function migrateStoredBlocks(
	client: EmdashClient,
	pending: readonly PendingMigration[],
): Promise<void> {
	for (const item of pending) {
		const migrated = item.blocks.map((block) => {
			const target = item.targetVersions.get(block._type);
			if (target === undefined || typeof block._version !== "number" || block._version >= target) {
				return block;
			}
			return { ...block, _version: target };
		});
		await client.migrateEntryBlocks(item.collection, item.entryId, {
			[item.field]: migrated,
		});
	}
}

/** Content entries the migration scan touched, for the plan's report. */
export function describeMigrations(pending: readonly PendingMigration[]): string[] {
	return pending.map(
		(item) =>
			`${item.collection}/${item.entryId}.${item.field}: ` +
			item.blocks
				.filter((block) => {
					const target = item.targetVersions.get(block._type);
					return target !== undefined && typeof block._version === "number" && block._version < target;
				})
				.map((block) => `${block._type} v${block._version}→v${item.targetVersions.get(block._type)}`)
				.join(", "),
	);
}

export type { ContentEntry, PlanAction };

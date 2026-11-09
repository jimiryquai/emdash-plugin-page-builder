/**
 * Build a plan from block definitions against a site's reported schema.
 *
 * Pure: no HTTP. `buildPlan` compares the package's block definitions with
 * the site's block types and says, per block type and version, whether it
 * would create, update, activate or leave it alone.
 */

import type {
	BlockTypeDefinition,
	Plan,
	PlanAction,
	PlanCounts,
	RemoteBlockType,
} from "./types.js";

function fieldsEqual(
	left: readonly unknown[],
	right: readonly unknown[],
): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

const EMPTY_COUNTS: PlanCounts = { create: 0, update: 0, activate: 0, migrate: 0, unchanged: 0 };

/**
 * Compare one definition with the site.
 *
 * Rules, from EmDash's versioned block type model (see
 * .orchestrate/evidence/api-contract.md):
 *
 * - A type the site lacks is created at v1 (active), each later version is
 *   created as a breaking, inactive version, and the definition's
 *   `currentVersion` is then activated. A brand-new type can hold no stored
 *   blocks, so activating its own current version is safe.
 * - A new version of an existing type is created inactive and is *not*
 *   activated without `--activate`: the site must first deploy a package
 *   release whose renderer handles both versions.
 * - A stored version whose fields differ from the definition is updated in
 *   place when it is the site's current version (EmDash rejects an
 *   incompatible change), and reported as a warning otherwise: the REST API
 *   cannot rewrite an old inactive version's contract.
 */
export function buildPlan(
	definitions: readonly BlockTypeDefinition[],
	remote: readonly RemoteBlockType[],
): Plan {
	const actions: PlanAction[] = [];
	const warnings: string[] = [];
	const bySlug = new Map(remote.map((type) => [type.slug, type]));

	for (const definition of definitions) {
		const existing = bySlug.get(definition.slug);
		if (!existing) {
			for (const version of sortedVersions(definition)) {
				actions.push({
					blockType: definition.slug,
					version: version.version,
					action: "create",
					detail: version.version === 1 ? "new block type at v1 (active)" : "new inactive version",
				});
			}
			actions.push({
				blockType: definition.slug,
				version: definition.currentVersion,
				action: "activate",
				autoActivate: true,
				detail: "new block type: activating its own current version",
			});
			continue;
		}

		for (const version of sortedVersions(definition)) {
			const stored = existing.versions.find((candidate) => candidate.version === version.version);
			if (!stored) {
				actions.push({
					blockType: definition.slug,
					version: version.version,
					action: "create",
					detail: "new inactive version (activate with --activate)",
				});
				continue;
			}
			if (fieldsEqual(stored.fields, version.fields)) {
				actions.push({ blockType: definition.slug, version: version.version, action: "unchanged" });
				continue;
			}
			if (stored.version === existing.currentVersion) {
				actions.push({
					blockType: definition.slug,
					version: version.version,
					action: "update",
					detail: "fields changed on the current version (must stay compatible)",
				});
			} else {
				const warning =
					`${definition.slug} v${version.version} on the site has different fields than the ` +
					`definition; the REST API cannot rewrite an inactive version's contract`;
				warnings.push(warning);
				actions.push({ blockType: definition.slug, version: version.version, action: "unchanged", detail: warning });
			}
		}

		if (definition.currentVersion !== existing.currentVersion) {
			const declared = definition.versions.some((v) => v.version === definition.currentVersion);
			if (declared && definition.currentVersion > existing.currentVersion) {
				actions.push({
					blockType: definition.slug,
					version: definition.currentVersion,
					action: "activate",
					detail: "requires --activate: deploy a renderer for both versions first",
				});
			} else if (declared) {
				warnings.push(
					`${definition.slug}: the site's current version (${existing.currentVersion}) is ahead of the definition (${definition.currentVersion}); not activating`,
				);
			} else {
				warnings.push(
					`${definition.slug}: currentVersion ${definition.currentVersion} is not declared in its versions`,
				);
			}
		}
	}

	return { actions, counts: countActions(actions), warnings };
}

/** Append migration actions (one per pending entry) after a content scan. */
export function addMigrations(
	plan: Plan,
	pending: ReadonlyArray<{ blockType: string; detail: string }>,
): Plan {
	const actions: PlanAction[] = [
		...plan.actions,
		...pending.map((item) => ({ ...item, version: null, action: "migrate" as const })),
	];
	return { actions, counts: countActions(actions), warnings: plan.warnings };
}

function sortedVersions(definition: BlockTypeDefinition) {
	return [...definition.versions].sort((left, right) => left.version - right.version);
}

function countActions(actions: readonly PlanAction[]): PlanCounts {
	const counts = { ...EMPTY_COUNTS };
	for (const action of actions) counts[action.action] += 1;
	return counts;
}

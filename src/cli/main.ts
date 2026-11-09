#!/usr/bin/env node
/**
 * The apply CLI: `emdash-page-builder apply <site> [options]`
 *
 * Plan by default (JSON on stdout), `--apply` to perform it, `--activate`
 * and `--migrate` for breaking versions, `--table` for a human view,
 * `--field <collection>/<field>` to add the block types to a blocks field's
 * allowedTypes, `--collections` to apply starter collections the definitions
 * module exports. Token from EMDASH_TOKEN (prefer it over --token, which is
 * visible in `ps`).
 *
 * Argument handling lives behind an entry-point guard (CODING_STANDARDS.md
 * rule 6): importing this module runs nothing.
 */

import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import type { BlockType } from "../blocks/core.js";
import { EmdashClient, EmdashError, fetchTransport, type Transport } from "./client.js";
import { executePlan, findPendingMigrations, isStale, migrateStoredBlocks } from "./apply.js";
import { addMigrations, buildPlan } from "./plan.js";
import { renderTable } from "./table.js";
import type { BlockTypeDefinition, Plan, RemoteField } from "./types.js";

export interface CliIo {
	out(message: string): void;
	err(message: string): void;
}

const USAGE = `usage: emdash-page-builder apply <site-url> [options]

options:
  --apply                 perform the plan (default: plan only)
  --activate              activate breaking versions (renderer deployed)
  --migrate               migrate stored blocks through the package's migration chain
  --table                 print a human view instead of JSON
  --field <col>/<field>   add the block types to a blocks field's allowedTypes
  --collections           apply starter collections from the definitions module
  --from <module>         module whose block-type exports to apply
                          (default: emdash-plugin-page-builder/blocks)
  --token <token>         API token; prefer EMDASH_TOKEN (a --token shows in ps)`;

interface CliErrorPayload {
	errors: Array<{
		message: string;
		operation?: string;
		code?: string;
		status?: number;
		blockType?: string;
		version?: number;
	}>;
	/** The plan as far as it got, so a partial --apply can be audited. */
	plan?: Plan;
}

export function errorPayload(error: unknown, plan?: Plan): CliErrorPayload {
	const base: CliErrorPayload =
		error instanceof EmdashError
			? {
					errors: [
						{
							message: `${error.operation}: ${error.message}`,
							operation: error.operation,
							code: error.code,
							status: error.status,
							blockType: error.blockType,
							version: error.version,
						},
					],
				}
			: { errors: [{ message: error instanceof Error ? error.message : String(error) }] };
	if (plan !== undefined) base.plan = plan;
	return base;
}

function isBlockType(value: unknown): value is BlockType {
	return (
		typeof value === "object" &&
		value !== null &&
		"definition" in value &&
		"variants" in value &&
		"migrations" in value
	);
}

/**
 * Load the block modules a module exports: every export that is a `BlockType`
 * (has `definition`, `variants`, `migrations`). No hand-kept list — the module
 * is the source of truth.
 */
export async function loadBlockTypes(modulePath: string): Promise<BlockType[]> {
	const module: Record<string, unknown> = await import(modulePath);
	const blocks = Object.values(module).filter(isBlockType);
	if (blocks.length === 0) {
		throw new Error(`${modulePath} exports no block types (exports with definition, variants, migrations)`);
	}
	return blocks;
}

export interface RunResult {
	site: string;
	applied: boolean;
	plan: Plan;
	collectionsCreated: string[];
	fieldUpdates: string[];
}

export async function run(
	argv: readonly string[],
	options: { transport?: Transport; token?: string },
	io: CliIo = { out: (m) => process.stdout.write(`${m}\n`), err: (m) => process.stderr.write(`${m}\n`) },
): Promise<number> {
	// The plan so far, so a failure mid-apply reports what was already written.
	let currentPlan: Plan | undefined;
	try {
		let parsed;
		try {
			parsed = parseArgs({
				args: [...argv],
				allowPositionals: true,
				options: {
					apply: { type: "boolean" },
					activate: { type: "boolean" },
					migrate: { type: "boolean" },
					table: { type: "boolean" },
					field: { type: "string" },
					collections: { type: "boolean" },
					from: { type: "string" },
					token: { type: "string" },
				},
			});
		} catch (error) {
			io.out(
				JSON.stringify(
					{ errors: [{ message: error instanceof Error ? error.message : String(error) }] },
					null,
					2,
				),
			);
			io.err(USAGE);
			return 2;
		}
		const flags = parsed.values;
		const [command, site] = parsed.positionals;
		if (command !== "apply" || !site) {
			io.out(JSON.stringify({ errors: [{ message: "expected: apply <site-url>" }] }, null, 2));
			io.err(USAGE);
			return 2;
		}

		const token = options.token ?? flags.token ?? process.env.EMDASH_TOKEN;
		if (!options.transport && !token) {
			io.out(JSON.stringify({ errors: [{ message: "EMDASH_TOKEN is not set and no --token was given" }] }, null, 2));
			return 1;
		}

		const from = flags.from ?? "emdash-plugin-page-builder/blocks";
		const blockTypes = await loadBlockTypes(from);
		const definitions = blockTypes.map((block) => block.definition);
		const client = new EmdashClient(options.transport ?? fetchTransport(site, token));

		currentPlan = buildPlan(definitions, (await client.listBlockTypes()).items);
		await executePlan(client, currentPlan, blockTypes, {
			apply: flags.apply ?? false,
			activate: flags.activate ?? false,
			migrate: flags.migrate ?? false,
		});

		// Scan after the schema ops: a just-run --activate makes more blocks
		// eligible. In plan-only mode nothing changed, so this is the site as-is.
		const scan = await findPendingMigrations(client, blockTypes, (await client.listBlockTypes()).items);
		currentPlan = addMigrations(
			currentPlan,
			scan.pending.map((item) => ({
				blockType: item.blocks.find((block) => isStale(block, item.targetVersions))?._type ?? "?",
				detail: `${item.collection}/${item.entryId}.${item.field}`,
			})),
		);
		currentPlan.warnings.push(...scan.warnings);

		if ((flags.apply ?? false) && (flags.migrate ?? false) && scan.pending.length > 0) {
			await migrateStoredBlocks(client, scan.pending, blockTypes);
		}
		for (const action of currentPlan.actions) {
			if (action.action === "migrate") {
				action.result = (flags.apply ?? false) && (flags.migrate ?? false) ? "done" : "skipped";
			}
		}

		let collectionsCreated: string[] = [];
		let fieldUpdates: string[] = [];
		if (flags.collections) {
			const planned = await planStarterCollections(client, from);
			if (flags.apply) collectionsCreated = await applyStarterCollections(client, from, planned);
			else collectionsCreated = planned;
		}
		if (flags.field) {
			// The plan reports what --field would add; the write happens only with --apply.
			fieldUpdates = await allowInField(client, flags.field, definitions, flags.apply ?? false);
		}

		const result: RunResult = {
			site,
			applied: Boolean(flags.apply),
			plan: currentPlan,
			collectionsCreated,
			fieldUpdates,
		};
		io.out(flags.table ? renderTable(result) : JSON.stringify(result, null, 2));
		return 0;
	} catch (error) {
		io.out(JSON.stringify(errorPayload(error, currentPlan), null, 2));
		return 1;
	}
}

/** The starter collections a module exports that the site lacks. */
async function planStarterCollections(client: EmdashClient, from: string): Promise<string[]> {
	const module: Record<string, unknown> = await import(from);
	const starters = module.starterCollections;
	if (!Array.isArray(starters)) return [];
	const existing = new Set((await client.listCollections()).items.map((c) => c.slug));
	return starters
		.map((starter) => (starter as Record<string, unknown>).slug)
		.filter((slug): slug is string => typeof slug === "string" && !existing.has(slug));
}

/** Create the planned starter collections. */
async function applyStarterCollections(
	client: EmdashClient,
	from: string,
	planned: readonly string[],
): Promise<string[]> {
	if (planned.length === 0) return [];
	const module: Record<string, unknown> = await import(from);
	const starters = module.starterCollections as Array<Record<string, unknown>>;
	for (const body of starters) {
		if (typeof body.slug === "string" && planned.includes(body.slug)) {
			await client.createCollection(body);
		}
	}
	return [...planned];
}

/** Compute the slugs --field would add to a blocks field's allowedTypes; write only when applying. */
async function allowInField(
	client: EmdashClient,
	spec: string,
	definitions: readonly BlockTypeDefinition[],
	write: boolean,
): Promise<string[]> {
	const match = /^([\w-]+)\/([\w-]+)$/.exec(spec);
	if (!match) throw new Error(`--field expects <collection>/<fieldSlug>, got "${spec}"`);
	const [, collection, fieldSlug] = match;
	const collections = await client.listCollections();
	const target = collections.items.find((c) => c.slug === collection);
	if (!target) throw new Error(`collection "${collection}" not found on the site`);
	const field = (target.fields ?? []).find((f) => f.slug === fieldSlug) as RemoteField | undefined;
	if (!field) throw new Error(`field "${collection}.${fieldSlug}" not found on the site`);
	if (field.type !== "blocks") throw new Error(`field "${collection}.${fieldSlug}" is not a blocks field`);

	const validation = { ...(field.validation ?? {}) };
	const existing = Array.isArray(validation.allowedTypes) ? (validation.allowedTypes as string[]) : [];
	const additions = definitions.map((d) => d.slug).filter((slug) => !existing.includes(slug));
	if (additions.length === 0) return [];
	if (write) {
		validation.allowedTypes = [...existing, ...additions];
		await client.updateField(collection, fieldSlug, { validation });
	}
	return additions;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	run(process.argv.slice(2), {}).then((code) => {
		process.exitCode = code;
	});
}

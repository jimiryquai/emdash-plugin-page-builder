#!/usr/bin/env node
/**
 * The apply CLI: `emdash-page-builder apply <site> [options]`
 *
 * Plan by default (JSON on stdout), `--apply` to perform it, `--activate`
 * and `--migrate` for breaking versions, `--table` for a human view,
 * `--field <collection>/<field>` to add the block types to a blocks field's
 * allowedTypes, `--collections` to apply starter collections the definitions
 * module exports. Token from EMDASH_TOKEN or --token.
 *
 * Argument handling lives behind an entry-point guard (CODING_STANDARDS.md
 * rule 6): importing this module runs nothing.
 */

import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { EmdashClient, EmdashError, fetchTransport } from "./client.js";
import { executePlan, findPendingMigrations, isStale, migrateStoredBlocks } from "./apply.js";
import { addMigrations, buildPlan } from "./plan.js";
import { renderTable } from "./table.js";
import type { BlockTypeDefinition, BlockTypeInput, Plan, RemoteField } from "./types.js";

export interface CliIo {
	out(message: string): void;
	err(message: string): void;
}

const USAGE = `usage: emdash-page-builder apply <site-url> [options]

options:
  --apply                 perform the plan (default: plan only)
  --activate              activate breaking versions (renderer deployed)
  --migrate               migrate stored blocks to the active version
  --table                 print a human view instead of JSON
  --field <col>/<field>   add the block types to a blocks field's allowedTypes
  --collections           apply starter collections from the definitions module
  --from <module>         module exporting the definitions (default: this package's blocks entry)
  --token <token>         API token (default: EMDASH_TOKEN)`;

interface CliErrorPayload {
	errors: Array<{
		message: string;
		operation?: string;
		code?: string;
		status?: number;
		blockType?: string;
		version?: number;
	}>;
}

export function errorPayload(error: unknown): CliErrorPayload {
	if (error instanceof EmdashError) {
		return {
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
		};
	}
	return { errors: [{ message: error instanceof Error ? error.message : String(error) }] };
}

/** Accept a definition or a block module (with `definition` beside extra keys). */
export function toDefinition(input: BlockTypeInput): BlockTypeDefinition {
	const definition = "definition" in input && typeof input.definition === "object" ? input.definition : input;
	const candidate = definition as BlockTypeDefinition;
	if (
		typeof candidate.slug !== "string" ||
		typeof candidate.label !== "string" ||
		!Array.isArray(candidate.versions) ||
		typeof candidate.currentVersion !== "number"
	) {
		throw new Error(`not a block type definition: ${JSON.stringify(candidate).slice(0, 200)}`);
	}
	return candidate;
}

/** Load definitions from a module: default export, or `definitions`/`blocks`. */
export async function loadDefinitions(modulePath: string): Promise<BlockTypeDefinition[]> {
	const module: Record<string, unknown> = await import(modulePath);
	const candidate = module.default ?? module.definitions ?? module.blocks;
	if (!Array.isArray(candidate)) {
		throw new Error(`${modulePath} exports no definitions array (default, definitions or blocks)`);
	}
	return candidate.map((entry) => toDefinition(entry as BlockTypeInput));
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
	options: { transport?: import("./client.js").Transport; token?: string },
	io: CliIo = { out: (m) => process.stdout.write(`${m}\n`), err: (m) => process.stderr.write(`${m}\n`) },
): Promise<number> {
	try {
		return await runChecked(argv, options, io);
	} catch (error) {
		io.out(JSON.stringify(errorPayload(error), null, 2));
		return 1;
	}
}

async function runChecked(
	argv: readonly string[],
	options: { transport?: import("./client.js").Transport; token?: string },
	io: CliIo,
): Promise<number> {
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
		io.out(JSON.stringify({ errors: [{ message: error instanceof Error ? error.message : String(error) }] }, null, 2));
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
		io.out(JSON.stringify({ errors: [{ message: "EMDASH_TOKEN is not set and no --token was given" }] }));
		return 1;
	}

	const from = flags.from ?? "emdash-plugin-page-builder/blocks";
	const definitions = await loadDefinitions(from);
	const client = new EmdashClient(
		options.transport ?? fetchTransport(site, token),
	);

	const remote = await client.listBlockTypes();
	let plan = buildPlan(definitions, remote.items);
	const pending = await findPendingMigrations(client, definitions);
	plan = addMigrations(
		plan,
		pending.map((item) => ({
			blockType:
				item.blocks.find((block) => isStale(block, item.targetVersions))?._type ?? "?",
			detail: `${item.collection}/${item.entryId}.${item.field}`,
		})),
	);

	await executePlan(client, plan, definitions, {
		apply: flags.apply ?? false,
		activate: flags.activate ?? false,
		migrate: flags.migrate ?? false,
	});

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
	if (flags.apply && flags.migrate && pending.length > 0) {
		await migrateStoredBlocks(client, pending);
	}
	for (const action of plan.actions) {
		if (action.action === "migrate") action.result = flags.apply && flags.migrate ? "done" : "skipped";
	}

	const result: RunResult = {
		site,
		applied: Boolean(flags.apply),
		plan,
		collectionsCreated,
		fieldUpdates,
	};
	io.out(flags.table ? renderTable(result) : JSON.stringify(result, null, 2));
	return 0;
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
	run(process.argv.slice(2), {}).then(
		(code) => {
			process.exitCode = code;
		},
		(error) => {
			process.stdout.write(`${JSON.stringify(errorPayload(error), null, 2)}\n`);
			process.exitCode = 1;
		},
	);
}

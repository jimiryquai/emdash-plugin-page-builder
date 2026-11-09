/**
 * A fake EmDash site: an in-memory implementation of the schema and content
 * endpoints the apply CLI uses, behind the injectable transport. No request
 * can leave this module, so tests never touch a real site.
 */

import { createHash } from "node:crypto";

function fingerprint(fields) {
	return `fp:${createHash("sha256").update(JSON.stringify(fields)).digest("hex").slice(0, 16)}`;
}

function now() {
	return new Date().toISOString();
}

export function createFakeSite() {
	/** @type {Map<string, any>} slug -> block type */
	const blockTypes = new Map();
	/** @type {Map<string, any>} slug -> collection {slug, fields: Map} */
	const collections = new Map();
	/** @type {Map<string, any>} collection slug -> entries by id */
	const content = new Map();
	const requests = [];

	const json = (status, body) => ({ status, json: body });
	const ok = (data, status = 200) => json(status, { success: true, data });
	const fail = (status, code, message) => json(status, { success: false, error: { code, message } });

	function activeVersion(type) {
		return type.versions.find((v) => v.version === type.currentVersion);
	}

	function fieldsEqual(a, b) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	function blockTypeResponse(type) {
		return {
			id: type.id,
			slug: type.slug,
			label: type.label,
			description: type.description ?? null,
			icon: type.icon ?? null,
			category: type.category ?? null,
			currentVersion: type.currentVersion,
			source: "user",
			versions: type.versions.map((v) => ({ ...v, active: v.version === type.currentVersion })),
			createdAt: type.createdAt,
			updatedAt: type.updatedAt,
		};
	}

	/**
	 * Seed the site as an earlier `apply` left it: block types straight from
	 * definitions, plus collections with fields and content entries.
	 */
	function seed({ blockTypes: types = [], collections: cols = [] } = {}) {
		for (const def of types) {
			blockTypes.set(def.slug, {
				id: `bt_${def.slug}`,
				slug: def.slug,
				label: def.label,
				description: def.description,
				currentVersion: def.currentVersion,
				createdAt: now(),
				updatedAt: now(),
				versions: def.versions.map((v) => ({ ...v, fingerprint: fingerprint(v.fields) })),
			});
		}
		for (const col of cols) {
			const fields = new Map();
			for (const field of col.fields ?? []) fields.set(field.slug, field);
			collections.set(col.slug, { slug: col.slug, label: col.label ?? col.slug, fields });
			content.set(col.slug, new Map((col.entries ?? []).map((entry) => [entry.id, entry])));
		}
	}

	async function handle(request) {
		requests.push(request);
		const url = new URL(request.path, "http://fake.local");
		const parts = url.pathname.split("/").filter(Boolean); // _emdash, api, ...
		const [, , ...path] = parts;

		if (request.method === "GET" && path.join("/") === "schema/block-types") {
			return ok({ items: [...blockTypes.values()].map(blockTypeResponse) });
		}

		if (request.method === "POST" && path.join("/") === "schema/block-types") {
			const body = request.body;
			if (blockTypes.has(body.slug)) {
				return fail(409, "BLOCK_TYPE_EXISTS", `Block type "${body.slug}" already exists`);
			}
			blockTypes.set(body.slug, {
				id: `bt_${body.slug}`,
				slug: body.slug,
				label: body.label,
				description: body.description ?? null,
				currentVersion: 1,
				createdAt: now(),
				updatedAt: now(),
				versions: [{ version: 1, fields: body.fields, fingerprint: fingerprint(body.fields) }],
			});
			return ok({ item: blockTypeResponse(blockTypes.get(body.slug)) }, 201);
		}

		const blockTypeMatch = /^schema\/block-types\/([\w-]+)$/.exec(path.join("/"));
		if (request.method === "PUT" && blockTypeMatch) {
			const type = blockTypes.get(blockTypeMatch[1]);
			if (!type) return fail(404, "BLOCK_TYPE_NOT_FOUND", `Block type '${blockTypeMatch[1]}' not found`);
			const active = activeVersion(type);
			if (active.fingerprint !== request.body.expectedFingerprint) {
				return fail(409, "CONFLICT", `Block type "${type.slug}" changed since it was read`);
			}
			if (request.body.fields !== undefined) {
				const storedSame = type.versions.find(
					(v) => v.fingerprint === fingerprint(request.body.fields),
				);
				if (!storedSame && !request.body.breaking) {
					return fail(400, "BLOCK_TYPE_BREAKING_CHANGE", `Block type "${type.slug}" update requires a new version`);
				}
				const existing = type.versions.find((v) => fieldsEqual(v.fields, request.body.fields));
				if (existing) {
					existing.fields = request.body.fields;
					existing.fingerprint = fingerprint(request.body.fields);
				} else {
					const next = Math.max(...type.versions.map((v) => v.version)) + 1;
					// A breaking update adds a new version but never activates it.
					type.versions.push({
						version: next,
						fields: request.body.fields,
						fingerprint: fingerprint(request.body.fields),
					});
				}
			}
			for (const key of ["label", "description", "icon", "category"]) {
				if (request.body[key] !== undefined) type[key] = request.body[key];
			}
			type.updatedAt = now();
			return ok({ item: blockTypeResponse(type) });
		}

		const activateMatch = /^schema\/block-types\/([\w-]+)\/versions\/(\d+)\/activate$/.exec(path.join("/"));
		if (request.method === "POST" && activateMatch) {
			const type = blockTypes.get(activateMatch[1]);
			if (!type) return fail(404, "BLOCK_TYPE_NOT_FOUND", `Block type '${activateMatch[1]}' not found`);
			if (activeVersion(type).fingerprint !== request.body.expectedFingerprint) {
				return fail(409, "CONFLICT", `Block type "${type.slug}" changed since it was read`);
			}
			const version = Number(activateMatch[2]);
			if (!type.versions.some((v) => v.version === version)) {
				return fail(400, "BLOCK_TYPE_VERSION_CONFLICT", `Block type "${type.slug}" has no version ${version}`);
			}
			type.currentVersion = version;
			type.updatedAt = now();
			return ok({ item: blockTypeResponse(type) });
		}

		if (request.method === "GET" && path.join("/") === "schema/collections") {
			return ok({ items: [...collections.values()].map((c) => ({ id: `col_${c.slug}`, slug: c.slug, label: c.label })) });
		}

		const collectionMatch = /^schema\/collections\/([\w-]+)$/.exec(path.join("/"));
		if (request.method === "GET" && collectionMatch) {
			const collection = collections.get(collectionMatch[1]);
			if (!collection) return fail(404, "NOT_FOUND", `Collection not found: ${collectionMatch[1]}`);
			return ok({
				item: {
					id: `col_${collection.slug}`,
					slug: collection.slug,
					label: collection.label,
					fields: [...collection.fields.values()],
				},
			});
		}
		if (request.method === "POST" && path.join("/") === "schema/collections") {
			const slug = request.body.slug;
			if (collections.has(slug)) return fail(409, "COLLECTION_EXISTS", `Collection "${slug}" already exists`);
			collections.set(slug, { slug, label: request.body.label ?? slug, fields: new Map() });
			return ok({ item: { id: `col_${slug}`, slug, label: request.body.label ?? slug, fields: [] } }, 201);
		}

		const fieldMatch = /^schema\/collections\/([\w-]+)\/fields\/([\w-]+)$/.exec(path.join("/"));
		if (request.method === "PUT" && fieldMatch) {
			const collection = collections.get(fieldMatch[1]);
			if (!collection) return fail(404, "NOT_FOUND", `Collection not found: ${fieldMatch[1]}`);
			const field = collection.fields.get(fieldMatch[2]);
			if (!field) return fail(404, "NOT_FOUND", `Field not found: ${fieldMatch[2]}`);
			Object.assign(field, request.body);
			return ok({ item: field });
		}

		const contentMatch = /^content\/([\w-]+)$/.exec(path.join("/"));
		if (request.method === "GET" && contentMatch) {
			const entries = content.get(contentMatch[1]);
			if (!entries) return fail(404, "NOT_FOUND", `Collection not found: ${contentMatch[1]}`);
			return ok({ items: [...entries.values()], total: entries.size });
		}

		const entryMatch = /^content\/([\w-]+)\/([\w-]+)$/.exec(path.join("/"));
		if (request.method === "PUT" && entryMatch) {
			const entries = content.get(entryMatch[1]);
			const entry = entries?.get(entryMatch[2]);
			if (!entry) return fail(404, "NOT_FOUND", `Content item not found: ${entryMatch[2]}`);
			const data = request.body.data ?? {};
			for (const [fieldSlug, value] of Object.entries(data)) {
				if (Array.isArray(value) && request.body.migrateBlocks) {
					for (const block of value) {
						const type = blockTypes.get(block._type);
						if (!type) return fail(400, "VALIDATION_ERROR", `block type "${block._type}" is unavailable`);
						if (block._version !== type.currentVersion) {
							return fail(400, "VALIDATION_ERROR", `${fieldSlug}._version: migration target must be the active version`);
						}
					}
				}
				entry.data[fieldSlug] = value;
			}
			return ok({ item: entry });
		}

		return fail(404, "NOT_FOUND", `No such endpoint: ${request.method} ${request.path}`);
	}

	/** The transport the client injects; every request is served from memory. */
	async function transport(request) {
		return handle(request);
	}

	return { transport, seed, blockTypes, collections, content, requests };
}

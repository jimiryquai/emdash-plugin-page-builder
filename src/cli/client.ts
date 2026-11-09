/**
 * The HTTP boundary to an EmDash site.
 *
 * Everything the apply CLI does to a site goes through `EmdashClient`, whose
 * transport is injectable: tests supply a fake site and no request can reach
 * the network (CODING_STANDARDS.md rule 7).
 *
 * Endpoints and body shapes, each confirmed against the emdash 1.4.0 source:
 * see .orchestrate/evidence/api-contract.md.
 */

import type { RemoteBlockType, RemoteCollection } from "./types.js";

/** One request to an EmDash site. `path` starts at /_emdash/api. */
export interface TransportRequest {
	method: "GET" | "POST" | "PUT";
	path: string;
	query?: Record<string, string>;
	body?: unknown;
}

export interface TransportResponse {
	status: number;
	json: unknown;
}

/** A fetch-like function; the default one speaks HTTPS to a real site. */
export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

/** An EmDash error, carrying everything needed to name the failing operation. */
export class EmdashError extends Error {
	readonly operation: string;
	readonly status: number;
	readonly code?: string;
	readonly blockType?: string;
	readonly version?: number;

	constructor(init: {
		operation: string;
		status: number;
		code?: string;
		message: string;
		blockType?: string;
		version?: number;
	}) {
		super(init.message);
		this.name = "EmdashError";
		this.operation = init.operation;
		this.status = init.status;
		this.code = init.code;
		this.blockType = init.blockType;
		this.version = init.version;
	}
}

function joinQuery(query?: Record<string, string>): string {
	if (!query) return "";
	const encoded = new URLSearchParams(query).toString();
	return encoded ? `?${encoded}` : "";
}

/** The default transport: real HTTP against the site, Bearer-authenticated. */
export function fetchTransport(
	siteUrl: string,
	token: string | undefined,
	fetchFn: typeof fetch = fetch,
): Transport {
	const base = siteUrl.replace(/\/+$/, "");
	return async ({ method, path, query, body }) => {
		const response = await fetchFn(`${base}${path}${joinQuery(query)}`, {
			method,
			headers: {
				"content-type": "application/json",
				...(token ? { authorization: `Bearer ${token}` } : {}),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const json: unknown = await response.json().catch(() => undefined);
		return { status: response.status, json };
	};
}

export interface ContentEntry {
	id: string;
	slug?: string;
	status?: string;
	data: Record<string, unknown>;
	_rev?: string;
	[key: string]: unknown;
}

interface RemoteList<T> {
	items: T[];
	nextCursor?: string;
	total?: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function itemsOf<T>(data: unknown): RemoteList<T> {
	const record = asRecord(data);
	return {
		items: Array.isArray(record?.items) ? (record!.items as T[]) : [],
		nextCursor: typeof record?.nextCursor === "string" ? record.nextCursor : undefined,
		total: typeof record?.total === "number" ? record.total : undefined,
	};
}

function itemOf<T>(data: unknown): T {
	const record = asRecord(data);
	const item = record && "item" in record ? asRecord(record.item) : record;
	return (item ?? {}) as T;
}

export class EmdashClient {
	readonly #transport: Transport;

	constructor(transport: Transport) {
		this.#transport = transport;
	}

	async #request(
		operation: string,
		method: TransportRequest["method"],
		path: string,
		options?: {
			query?: Record<string, string>;
			body?: unknown;
			blockType?: string;
			version?: number;
			expectStatus?: number;
		},
	): Promise<unknown> {
		const response = await this.#transport({
			method,
			path,
			query: options?.query,
			body: options?.body,
		});
		const envelope = asRecord(response.json);
		const expectStatus = options?.expectStatus ?? 200;
		const ok = expectStatus === 201 ? response.status === 201 : response.status >= 200 && response.status <= 299;
		if (!ok || envelope?.success !== true) {
			const error = asRecord(envelope?.error);
			throw new EmdashError({
				operation,
				status: response.status,
				code: typeof error?.code === "string" ? error.code : undefined,
				message:
					typeof error?.message === "string"
						? error.message
						: `EmDash returned ${response.status} for ${operation}`,
				blockType: options?.blockType,
				version: options?.version,
			});
		}
		return envelope?.data;
	}

	/** GET /_emdash/api/schema/block-types */
	async listBlockTypes(): Promise<RemoteList<RemoteBlockType>> {
		const data = await this.#request("list block types", "GET", "/_emdash/api/schema/block-types");
		return itemsOf<RemoteBlockType>(data);
	}

	/** POST /_emdash/api/schema/block-types — creates the type at version 1, active. */
	async createBlockType(definition: {
		slug: string;
		label: string;
		description?: string;
		icon?: string;
		category?: string;
		fields: unknown[];
	}): Promise<RemoteBlockType> {
		const data = await this.#request("create block type", "POST", "/_emdash/api/schema/block-types", {
			body: definition,
			expectStatus: 201,
			blockType: definition.slug,
		});
		return itemOf<RemoteBlockType>(data);
	}

	/** PUT /_emdash/api/schema/block-types/{slug} — new (breaking) or in-place version. */
	async updateBlockType(
		slug: string,
		body: {
			expectedFingerprint: string;
			label?: string;
			description?: string | null;
			icon?: string | null;
			category?: string | null;
			fields?: unknown[];
			breaking?: boolean;
		},
		version?: number,
	): Promise<RemoteBlockType> {
		const data = await this.#request(`update block type ${slug}`, "PUT", `/_emdash/api/schema/block-types/${slug}`, {
			body,
			blockType: slug,
			version,
		});
		return itemOf<RemoteBlockType>(data);
	}

	/**
	 * POST /_emdash/api/schema/block-types/{slug}/versions/{version}/activate —
	 * `expectedFingerprint` is the fingerprint of the currently *active*
	 * version, not of the target.
	 */
	async activateBlockTypeVersion(
		slug: string,
		version: number,
		expectedFingerprint: string,
	): Promise<RemoteBlockType> {
		const data = await this.#request(
			`activate block type ${slug} v${version}`,
			"POST",
			`/_emdash/api/schema/block-types/${slug}/versions/${version}/activate`,
			{ body: { expectedFingerprint }, blockType: slug, version },
		);
		return itemOf<RemoteBlockType>(data);
	}

	/**
	 * Collections with their fields: the list endpoint carries no fields, so
	 * each collection is fetched from /_emdash/api/schema/collections/{slug}
	 * with includeFields=true.
	 */
	async listCollections(): Promise<RemoteList<RemoteCollection>> {
		const data = await this.#request("list collections", "GET", "/_emdash/api/schema/collections");
		const listed = itemsOf<RemoteCollection>(data);
		const items: RemoteCollection[] = [];
		for (const collection of listed.items) {
			const detail = await this.#request(
				`get collection ${collection.slug}`,
				"GET",
				`/_emdash/api/schema/collections/${collection.slug}`,
				{ query: { includeFields: "true" } },
			);
			items.push(itemOf<RemoteCollection>(detail));
		}
		return { items, nextCursor: listed.nextCursor, total: listed.total };
	}

	/** POST /_emdash/api/schema/collections */
	async createCollection(body: Record<string, unknown>): Promise<RemoteCollection> {
		const slug = typeof body.slug === "string" ? body.slug : "";
		const data = await this.#request(`create collection ${slug}`, "POST", "/_emdash/api/schema/collections", {
			body,
			expectStatus: 201,
		});
		return itemOf<RemoteCollection>(data);
	}

	/** PUT /_emdash/api/schema/collections/{slug}/fields/{fieldSlug} */
	async updateField(
		collection: string,
		fieldSlug: string,
		body: Record<string, unknown>,
	): Promise<unknown> {
		return this.#request(`update field ${collection}.${fieldSlug}`, "PUT", `/_emdash/api/schema/collections/${collection}/fields/${fieldSlug}`, {
			body,
		});
	}

	/** GET /_emdash/api/content/{collection} — one page of entries. */
	async listContent(collection: string, page: number, limit = 100): Promise<RemoteList<ContentEntry>> {
		const data = await this.#request(`list content ${collection}`, "GET", `/_emdash/api/content/${collection}`, {
			query: { page: String(page), limit: String(limit), status: "all" },
		});
		return itemsOf<ContentEntry>(data);
	}

	/**
	 * PUT /_emdash/api/content/{collection}/{id} with `migrateBlocks: true` —
	 * EmDash's one supported way to move a stored block to the active version;
	 * it preserves `_key` and validates the block against the target schema.
	 */
	async migrateEntryBlocks(
		collection: string,
		id: string,
		data: Record<string, unknown>,
	): Promise<void> {
		await this.#request(`migrate blocks ${collection}/${id}`, "PUT", `/_emdash/api/content/${collection}/${id}`, {
			body: { data, migrateBlocks: true },
		});
	}
}

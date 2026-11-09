/**
 * EmDash's block-field contract rules, ported for client-side use.
 *
 * EmDash 1.4.0 does not export these from its package root (only its internal
 * `#schema` module has them), so the CLI carries a faithful port of
 * `node_modules/emdash/src/schema/block-type-contract.ts`:
 *
 * - `canonicalize` (source ~lines 247-259): recursively sort object keys,
 *   drop `undefined` values.
 * - `contractFields` (~261-270): the fields' contract projection — `required`
 *   defaults to false, absent keys omitted.
 * - `canonicalBlockFields` / `fingerprintBlockFields` (~272-286): the
 *   canonical JSON string and its `block-type:v1:sha256:` digest.
 * - `compareFields` / `compareValidation` (~345-478): which field changes are
 *   compatible (optional field added, constraint relaxed, …) and which are
 *   breaking (field removed, field added required, type changed, …).
 *
 * If a later emdash release exports these, switch to them; the tests compare
 * against the same port, so drift would be caught.
 */

import type { BlockFieldDefinition } from "emdash";

export interface BlockTypeDifference {
	path: string;
	change: string;
	compatibility: "compatible" | "breaking";
}

export interface BlockTypeCompatibility {
	compatible: boolean;
	differences: BlockTypeDifference[];
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (!value || typeof value !== "object") return value;
	const result: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value).toSorted(([left], [right]) =>
		left.localeCompare(right),
	)) {
		if (entry !== undefined) result[key] = canonicalize(entry);
	}
	return result;
}

function contractFields(fields: readonly BlockFieldDefinition[]): ContractField[] {
	return fields.map((field) => ({
		slug: field.slug,
		type: field.type,
		required: field.required ?? false,
		...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
		...(field.validation !== undefined ? { validation: field.validation } : {}),
		...(field.options !== undefined ? { options: field.options } : {}),
	}));
}

/** Canonical JSON of a fields contract: key order and undefined-insensitive. */
export function canonicalBlockFields(fields: readonly BlockFieldDefinition[]): string {
	return JSON.stringify(canonicalize(contractFields(fields)));
}

/** Same fields contract, canonically — for plan idempotency. */
export function blockFieldsEqual(
	left: readonly BlockFieldDefinition[],
	right: readonly BlockFieldDefinition[],
): boolean {
	return canonicalBlockFields(left) === canonicalBlockFields(right);
}

/** EmDash's block type version fingerprint (`block-type:v1:sha256:…`). */
export async function fingerprintBlockFields(
	fields: readonly BlockFieldDefinition[],
): Promise<string> {
	const bytes = new TextEncoder().encode(canonicalBlockFields(fields));
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
	return `block-type:v1:sha256:${hex}`;
}

function equal(a: unknown, b: unknown): boolean {
	return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

function difference(
	differences: BlockTypeDifference[],
	path: string,
	change: string,
	compatibility: "compatible" | "breaking",
): void {
	differences.push({ path, change, compatibility });
}

function compareLowerBound(
	differences: BlockTypeDifference[],
	path: string,
	key: "min" | "minLength" | "minItems",
	before: number | undefined,
	after: number | undefined,
): void {
	if (before === after) return;
	const compatible = after === undefined || (before !== undefined && after <= before);
	difference(differences, `${path}.validation.${key}`, "changed", compatible ? "compatible" : "breaking");
}

function compareUpperBound(
	differences: BlockTypeDifference[],
	path: string,
	key: "max" | "maxLength" | "maxItems",
	before: number | undefined,
	after: number | undefined,
): void {
	if (before === after) return;
	const compatible = after === undefined || (before !== undefined && after >= before);
	difference(differences, `${path}.validation.${key}`, "changed", compatible ? "compatible" : "breaking");
}

function compareSet(
	differences: BlockTypeDifference[],
	path: string,
	before: readonly string[] | undefined,
	after: readonly string[] | undefined,
): void {
	if (equal(before, after)) return;
	if (after === undefined) {
		difference(differences, path, "constraint removed", "compatible");
		return;
	}
	if (before === undefined) {
		difference(differences, path, "constraint added", "breaking");
		return;
	}
	const afterSet = new Set(after);
	const removed = before.some((value) => !afterSet.has(value));
	difference(differences, path, "allowed values changed", removed ? "breaking" : "compatible");
}

interface RepeaterSubFieldLike {
	slug: string;
	label?: string;
	type?: string;
	required?: boolean;
	options?: string[];
}

function repeaterFields(fields: readonly unknown[] | undefined): ContractField[] {
	return (fields ?? []).map((field) => {
		const sub = field as RepeaterSubFieldLike;
		return {
			slug: sub.slug,
			label: sub.label,
			type: sub.type,
			required: sub.required,
			...(sub.options ? { validation: { options: sub.options } } : {}),
		};
	});
}

interface ValidationLike {
	min?: number;
	max?: number;
	minLength?: number;
	maxLength?: number;
	minItems?: number;
	maxItems?: number;
	pattern?: string;
	options?: string[];
	allowedMimeTypes?: string[];
	subFields?: unknown[];
}

interface ValidationCarrier {
	type?: string;
	validation?: ValidationLike;
	options?: { darkVariant?: boolean };
}

function compareValidation(
	differences: BlockTypeDifference[],
	path: string,
	before: ValidationCarrier,
	after: ValidationCarrier,
): void {
	const beforeValidation = before.validation;
	const afterValidation = after.validation;
	compareLowerBound(differences, path, "min", beforeValidation?.min, afterValidation?.min);
	compareUpperBound(differences, path, "max", beforeValidation?.max, afterValidation?.max);
	compareLowerBound(differences, path, "minLength", beforeValidation?.minLength, afterValidation?.minLength);
	compareUpperBound(differences, path, "maxLength", beforeValidation?.maxLength, afterValidation?.maxLength);
	compareLowerBound(differences, path, "minItems", beforeValidation?.minItems, afterValidation?.minItems);
	compareUpperBound(differences, path, "maxItems", beforeValidation?.maxItems, afterValidation?.maxItems);
	if (beforeValidation?.pattern !== afterValidation?.pattern) {
		const compatible = afterValidation?.pattern === undefined;
		difference(
			differences,
			`${path}.validation.pattern`,
			"changed",
			compatible ? "compatible" : "breaking",
		);
	}
	compareSet(differences, `${path}.validation.options`, beforeValidation?.options, afterValidation?.options);
	compareSet(
		differences,
		`${path}.validation.allowedMimeTypes`,
		beforeValidation?.allowedMimeTypes,
		afterValidation?.allowedMimeTypes,
	);
	if (before.type === "repeater" && after.type === "repeater") {
		compareFieldLists(
			differences,
			`${path}.validation.subFields`,
			repeaterFields(beforeValidation?.subFields),
			repeaterFields(afterValidation?.subFields),
		);
	}
}

interface ContractField {
	slug: string;
	type?: string;
	required?: boolean;
	defaultValue?: unknown;
	validation?: unknown;
	options?: unknown;
}

function compareFieldLists(
	differences: BlockTypeDifference[],
	path: string,
	before: readonly ContractField[],
	after: readonly ContractField[],
): void {
	const beforeBySlug = new Map(before.map((field) => [field.slug, field]));
	const afterBySlug = new Map(after.map((field) => [field.slug, field]));
	for (const field of before) {
		if (!afterBySlug.has(field.slug)) {
			difference(differences, `${path}.${field.slug}`, "field removed", "breaking");
		}
	}
	for (const field of after) {
		const previous = beforeBySlug.get(field.slug);
		const fieldPath = `${path}.${field.slug}`;
		if (!previous) {
			difference(differences, fieldPath, "field added", field.required ? "breaking" : "compatible");
			continue;
		}
		if (previous.type !== field.type) {
			difference(differences, `${fieldPath}.type`, "type changed", "breaking");
			continue;
		}
		if ((previous.required ?? false) !== (field.required ?? false)) {
			difference(
				differences,
				`${fieldPath}.required`,
				"required changed",
				field.required ? "breaking" : "compatible",
			);
		}
		if (!equal(previous.defaultValue, field.defaultValue)) {
			difference(differences, `${fieldPath}.defaultValue`, "default changed", "compatible");
		}
		compareValidation(differences, fieldPath, previous as ValidationCarrier, field as ValidationCarrier);
		const beforeDark = darkVariant(previous.options);
		const afterDark = darkVariant(field.options);
		if (beforeDark !== afterDark) {
			difference(
				differences,
				`${fieldPath}.options.darkVariant`,
				"dark variant changed",
				afterDark ? "compatible" : "breaking",
			);
		}
	}
}

function darkVariant(options: unknown): boolean {
	return typeof options === "object" && options !== null && "darkVariant" in options
		? Boolean(options.darkVariant)
		: false;
}

/**
 * Whether moving from `before` to `after` is compatible with stored content
 * (EmDash would update the active version in place) or breaking (it needs a
 * new inactive version). Ported from `compareBlockFields`.
 */
export function compareBlockFields(
	before: readonly BlockFieldDefinition[],
	after: readonly BlockFieldDefinition[],
): BlockTypeCompatibility {
	const differences: BlockTypeDifference[] = [];
	compareFieldLists(differences, "fields", contractFields(before), contractFields(after));
	return {
		compatible: differences.every((entry) => entry.compatibility === "compatible"),
		differences,
	};
}

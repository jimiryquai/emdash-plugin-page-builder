/** The `--table` human view of the same result the JSON output carries. */

import type { Plan } from "./types.js";

export function renderTable(input: { site: string; applied: boolean; plan: Plan }): string {
	const width = {
		blockType: Math.max("BLOCK TYPE".length, ...input.plan.actions.map((a) => a.blockType.length)),
		version: "VERSION".length,
		action: Math.max("ACTION".length, ...input.plan.actions.map((a) => actionWord(a).length)),
	};

	const lines: string[] = [];
	lines.push(`${input.site}  (${input.applied ? "applied" : "plan only"})`);
	lines.push("");
	if (input.plan.actions.length === 0) {
		lines.push("no block types to consider");
	}
	for (const action of input.plan.actions) {
		const cells = [
			action.blockType.padEnd(width.blockType),
			String(action.version ?? "-").padStart(width.version),
			actionWord(action).padEnd(width.action),
		];
		const status = action.result === "done" ? "  ✓" : action.result === "skipped" ? "  – skipped" : "";
		lines.push(`${cells.join("  ")}${action.detail ? `  ${action.detail}` : ""}${status}`);
	}
	for (const warning of input.plan.warnings) {
		lines.push(`warning: ${warning}`);
	}
	return lines.join("\n");
}

function actionWord(action: Plan["actions"][number]): string {
	return action.result === "skipped" ? `${action.action} (skipped)` : action.action;
}

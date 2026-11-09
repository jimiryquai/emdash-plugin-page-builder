/**
 * The hero module with every field's keys in a different order: the same
 * contract canonically, so a site seeded from `definitions.mjs` must plan
 * `unchanged` against it.
 */
export const heroReordered = {
	definition: {
		description: "A page hero: heading, body, image, links.",
		currentVersion: 2,
		versions: [
			{
				fields: [
					{ type: "string", required: true, label: "Heading", slug: "heading" },
					{ type: "text", label: "Body", slug: "body" },
				],
				version: 1,
			},
			{
				fields: [
					{ type: "string", required: true, label: "Heading", slug: "heading" },
					{ type: "text", label: "Text", slug: "text" },
				],
				version: 2,
			},
		],
		label: "Hero",
		slug: "hero",
	},
	variants: ["default", "dark"],
	migrations: {},
};

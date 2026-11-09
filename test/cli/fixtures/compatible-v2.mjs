/** A block module whose v2 is only a compatible change (an optional field). */
export const card = {
	definition: {
		slug: "card",
		label: "Card",
		description: "A card.",
		currentVersion: 2,
		versions: [
			{
				version: 1,
				fields: [{ slug: "heading", label: "Heading", type: "string", required: true }],
			},
			{
				version: 2,
				fields: [
					{ slug: "heading", label: "Heading", type: "string", required: true },
					{ slug: "intro", label: "Intro", type: "text" },
				],
			},
		],
	},
	variants: ["default"],
	migrations: {},
};

/** Fixture block modules in the shape the blocks core exports. */

/** v2 is genuinely breaking: `body` is removed and `text` takes its value. */
export const hero = {
	definition: {
		slug: "hero",
		label: "Hero",
		description: "A page hero: heading, body, image, links.",
		currentVersion: 2,
		versions: [
			{
				version: 1,
				fields: [
					{ slug: "heading", label: "Heading", type: "string", required: true },
					{ slug: "body", label: "Body", type: "text" },
				],
			},
			{
				version: 2,
				fields: [
					{ slug: "heading", label: "Heading", type: "string", required: true },
					{ slug: "text", label: "Text", type: "text" },
				],
			},
		],
	},
	variants: ["default", "dark"],
	migrations: {
		1: (block) => ({
			_type: block._type,
			_version: 2,
			_key: block._key,
			heading: block.heading,
			text: block.body,
		}),
	},
};

export const cta = {
	definition: {
		slug: "cta",
		label: "Call to action",
		description: "A closing call to action.",
		currentVersion: 1,
		versions: [
			{
				version: 1,
				fields: [{ slug: "heading", label: "Heading", type: "string", required: true }],
			},
		],
	},
	variants: ["default"],
	migrations: {},
};

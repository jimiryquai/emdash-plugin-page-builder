/** Fixture block definitions in the seed shape the CLI takes as input. */

export const hero = {
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
				{ slug: "body", label: "Body", type: "text" },
				{ slug: "image", label: "Image", type: "image" },
			],
		},
	],
};

export const cta = {
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
};

export default [hero, cta];

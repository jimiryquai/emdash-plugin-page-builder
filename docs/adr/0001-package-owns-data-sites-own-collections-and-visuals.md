# The package owns the data layer; sites own their collections and visuals

The page builder owns block definitions, versions, migrations, content shapes and the block layer that resolves sources and picks variants. Each site keeps its own collections, mapped to the shapes through typed sources, and supplies its own visual sections. We first planned for the package to own the testimonials, pricing and FAQ collections, so that a block and its content had one home. We reversed that after looking at Bricks and ACF Pro: neither page builder owns the site's content types. The shape now gives the block and its content one home, and because sources are typed against EmDash's generated collection types, a mapping that drifts fails the build instead of rendering an empty block.

## Considered options

- **Package owns the collections**: one home for block and content, but the package becomes a schema installer for content it doesn't control, and every existing site has to migrate onto its collections.
- **Package ships visuals** (as Bricks does): every site would end up looking like the package. Sites must control their own design.

## Consequences

The package ships no visual components in v1; a site must supply a default section for each block it uses. Optional starter collections, with default sources, serve sites that have no collections of their own.

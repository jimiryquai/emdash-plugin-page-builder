# Each block has a fixed variant vocabulary that sites map to their sections

A block's `variant` options (for example `grid | split | single | carousel`) are fixed in the package's block definition. Each site maps them to its own sections, and an unmapped variant falls back to the block's default section. We rejected site-defined variants written into the definition at apply time: those would give the schema two owners, a site's `testimonials v2` would no longer be the package's `testimonials v2`, and the package's migrations would stop being safe to run on that site.

## Consequences

An editor can pick a variant that a site hasn't designed, and gets the default section. A site that needs a new layout gets it through a minor package release, since adding a select option is a compatible schema change in EmDash.

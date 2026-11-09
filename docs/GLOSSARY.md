# Page builder

The page-building layer on EmDash's `blocks` field: versioned block types and the logic that turns stored blocks into a site's own sections.

## Language

**Block type**:
A versioned definition of one kind of page block (hero, testimonials), owned by the package.
_Avoid_: layout (ACF's word), element, component

**Layout**:
A page's ordered composition of blocks, stored in a `blocks` field.
_Avoid_: flexible content, page body

**Variant**:
One of a block type's fixed visual options, chosen by the editor and mapped by each site to a section.
_Avoid_: style, template, layout

**Section**:
A site's own visual component that renders a block in one variant.
_Avoid_: block component, view

**Shape**:
The typed content a shared-content block displays (Testimonial, PricingTier), the contract between a source and a section.
_Avoid_: model, schema

**Source**:
A site's typed mapping from its own collection's entries to a shape.
_Avoid_: adapter, provider, query

**Group**:
The entry a page belongs to (on jamesryan-sites, a service), set by a reference on the page and used by `page` scope.
_Avoid_: category, tag

**Scope**:
Whether a shared-content block shows entries from the page's group (`page`) or every entry (`all`).

**Starter collections**:
Optional collection definitions the package can apply for a site with no collections of its own.
_Avoid_: default collections, seed

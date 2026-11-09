import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linksField, variantField, VARIANT_FIELD_SLUG } from 'emdash-plugin-page-builder/blocks';

test('variant fields use the shared slug and the block vocabulary', () => {
  const variants = Object.freeze(['compact', 'wide']);
  assert.equal(VARIANT_FIELD_SLUG, 'variant');
  assert.deepEqual(variantField(variants), {
    slug: 'variant', label: 'Variant', type: 'select',
    validation: { options: ['compact', 'wide'] },
  });
});

test('links fields are label and URL pairs with the primary action first', () => {
  assert.deepEqual(linksField(), {
    slug: 'links',
    label: 'Links',
    type: 'repeater',
    validation: {
      subFields: [
        { slug: 'label', label: 'Label', type: 'string', required: true },
        { slug: 'url', label: 'URL', type: 'url', required: true },
      ],
    },
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantField, VARIANT_FIELD_SLUG } from 'emdash-plugin-page-builder/blocks';

test('variant fields use the shared slug and the block vocabulary', () => {
  const variants = Object.freeze(['compact', 'wide']);
  assert.equal(VARIANT_FIELD_SLUG, 'variant');
  assert.deepEqual(variantField(variants), {
    slug: 'variant', label: 'Variant', type: 'select',
    validation: { options: ['compact', 'wide'] },
  });
});

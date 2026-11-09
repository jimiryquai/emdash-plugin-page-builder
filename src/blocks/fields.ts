import type { BlockFieldDefinition } from 'emdash';

export const VARIANT_FIELD_SLUG = 'variant';

/** Build the shared select field from a block's fixed variant vocabulary. */
export function variantField(variants: readonly string[]): BlockFieldDefinition {
  return {
    slug: VARIANT_FIELD_SLUG,
    label: 'Variant',
    type: 'select',
    validation: { options: [...variants] },
  };
}

export const SCOPE_FIELD_SLUG = 'scope';
export const SCOPES = ['page', 'all'] as const;

/** Build the shared scope select for shared-content blocks. */
export function scopeField(): BlockFieldDefinition {
  return {
    slug: SCOPE_FIELD_SLUG,
    label: 'Scope',
    type: 'select',
    defaultValue: 'all',
    validation: { options: [...SCOPES] },
  };
}

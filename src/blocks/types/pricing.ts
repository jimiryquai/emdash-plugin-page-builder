import type { ApplySeedBlockTypeInput, SeedCollection } from 'emdash';
import {
  createCollectionSource,
  GROUP_FIELD_SLUG,
  markdownText,
  scopeField,
  variantField,
} from '../core.js';
import type {
  BlockType,
  CollectionEntry,
  CollectionSourceOptions,
  Source,
  StoredBlock,
} from '../core.js';

/** The shape a pricing source produces and a pricing section renders. */
export interface PricingTier {
  name: string;
  price: string;
  price_monthly?: string;
  price_yearly?: string;
  period?: string;
  description?: string;
  features?: string;
  cta_label?: string;
  cta_url?: string;
  badge?: string;
  highlighted?: boolean;
}

export const STARTER_PRICING_COLLECTION = 'pricing';
export const PRICING_GROUP_FIELD = GROUP_FIELD_SLUG;

/**
 * The starter pricing collection, in EmDash's seed `collections` shape.
 * `groupCollection` names the site's own grouping collection; the `group`
 * reference matches entries against the page's group.
 */
export function starterPricingCollection(groupCollection: string): SeedCollection {
  return {
    slug: STARTER_PRICING_COLLECTION,
    label: 'Pricing Plans',
    labelSingular: 'Pricing Plan',
    description: 'Pricing tiers shown by the pricing block.',
    titleField: 'name',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true },
      { slug: 'price', label: 'Price', type: 'string', required: true },
      { slug: 'price_monthly', label: 'Price (Monthly)', type: 'string' },
      { slug: 'price_yearly', label: 'Price (Yearly)', type: 'string' },
      { slug: 'period', label: 'Period', type: 'string', defaultValue: '/mo' },
      { slug: 'description', label: 'Description', type: 'text' },
      { slug: 'features', label: 'Features (one per line)', type: 'text' },
      { slug: 'cta_label', label: 'CTA Label', type: 'string' },
      { slug: 'cta_url', label: 'CTA URL', type: 'string' },
      { slug: 'badge', label: 'Badge', type: 'string' },
      { slug: 'highlighted', label: 'Highlighted', type: 'boolean', defaultValue: false },
      {
        slug: PRICING_GROUP_FIELD,
        label: 'Group',
        type: 'reference',
        validation: { targetCollection: groupCollection },
      },
    ],
  };
}

function toPricingTier(entry: CollectionEntry): PricingTier {
  const {
    name,
    price,
    price_monthly,
    price_yearly,
    period,
    description,
    features,
    cta_label,
    cta_url,
    badge,
    highlighted,
  } = entry.data;
  return {
    name: String(name ?? ''),
    price: String(price ?? ''),
    price_monthly: price_monthly !== undefined ? String(price_monthly) : undefined,
    price_yearly: price_yearly !== undefined ? String(price_yearly) : undefined,
    period: period !== undefined ? String(period) : undefined,
    description: description !== undefined ? String(description) : undefined,
    features: features !== undefined ? String(features) : undefined,
    cta_label: cta_label !== undefined ? String(cta_label) : undefined,
    cta_url: cta_url !== undefined ? String(cta_url) : undefined,
    badge: badge !== undefined ? String(badge) : undefined,
    highlighted: highlighted !== undefined ? Boolean(highlighted) : undefined,
  };
}

/**
 * The default pricing source. It reads the starter collection (or another
 * collection with the same field names, via `collection`); a site whose fields
 * differ writes its own `Source<PricingTier>` against its own generated types.
 */
export function createPricingSource(options: CollectionSourceOptions = {}): Source<PricingTier> {
  return createCollectionSource({
    collection: options.collection ?? STARTER_PRICING_COLLECTION,
    groupField: options.groupField ?? PRICING_GROUP_FIELD,
    query: options.query,
    mapEntry: toPricingTier,
  });
}

const variants = ['tiers', 'toggle', 'single'] as const;

/** The block's own heading text, then each tier the site's source read. */
function toMarkdown(_block: Readonly<StoredBlock>, items?: readonly unknown[]): string {
  const parts = [`## ${pricing.definition.label}`];
  for (const stored of items ?? []) {
    if (typeof stored !== 'object' || stored === null) continue;
    const tier = stored as Record<string, unknown>;
    const tierParts: string[] = [];
    const name = markdownText(tier.name);
    const badge = markdownText(tier.badge);
    const heading = [name, badge].filter((part): part is string => part !== undefined).join(' — ');
    if (heading.length > 0) tierParts.push(`### ${heading}`);
    const monthly = markdownText(tier.price_monthly);
    const yearly = markdownText(tier.price_yearly);
    if (monthly !== undefined && yearly !== undefined) {
      tierParts.push(`- **Monthly**: ${monthly}\n- **Yearly**: ${yearly}`);
    } else {
      const price = markdownText(tier.price);
      const period = markdownText(tier.period);
      if (price !== undefined) tierParts.push(`**${price}**${period ?? ''}`);
    }
    const description = markdownText(tier.description);
    if (description !== undefined) tierParts.push(description);
    const features = markdownText(tier.features);
    if (features !== undefined) {
      const lines = features.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
      if (lines.length > 0) tierParts.push(lines.map((line) => `- ${line}`).join('\n'));
    }
    const ctaLabel = markdownText(tier.cta_label);
    const ctaUrl = markdownText(tier.cta_url);
    if (ctaLabel !== undefined && ctaUrl !== undefined) tierParts.push(`[${ctaLabel}](${ctaUrl})`);
    if (tierParts.length > 0) parts.push(tierParts.join('\n\n'));
  }
  return parts.join('\n\n');
}

export const pricing = {
  definition: {
    slug: 'pricing',
    label: 'Pricing',
    description:
      'Pricing tiers pulled from a shared pricing collection rather than written inline. ' +
      'Scope picks whether the tiers come from the page\'s group or the whole collection. ' +
      'Variant tiers shows several plans side by side; toggle adds a monthly and yearly ' +
      'billing switcher; single shows one plan beside its feature list.',
    currentVersion: 1,
    versions: [{ version: 1, fields: [variantField(variants), scopeField()] }],
  } satisfies ApplySeedBlockTypeInput & { description: string },
  variants,
  migrations: {},
  requiredToPublish: [],
  starter: starterPricingCollection,
  toMarkdown,
} satisfies BlockType;

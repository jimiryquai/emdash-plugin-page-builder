import type { ApplySeedBlockTypeInput, MediaValue, SeedCollection } from 'emdash';
import {
  countField,
  createCollectionSource,
  GROUP_FIELD_SLUG,
  scopeField,
  variantField,
} from '../core.js';
import type {
  BlockType,
  CollectionEntry,
  CollectionSourceOptions,
  Source,
} from '../core.js';

/** The shape a team source produces and a team section renders. */
export interface TeamMember {
  name: string;
  role: string;
  image?: MediaValue;
}

export const STARTER_TEAM_COLLECTION = 'team';
export const TEAM_GROUP_FIELD = GROUP_FIELD_SLUG;

/**
 * The starter team collection, in EmDash's seed `collections` shape.
 * `groupCollection` names the site's own grouping collection; the `group`
 * reference matches entries against the page's group.
 */
export function starterTeamCollection(groupCollection: string): SeedCollection {
  return {
    slug: STARTER_TEAM_COLLECTION,
    label: 'Team Members',
    labelSingular: 'Team Member',
    description: 'Team members shown by the team block.',
    titleField: 'name',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true },
      { slug: 'role', label: 'Role', type: 'string', required: true },
      { slug: 'image', label: 'Photo', type: 'image' },
      {
        slug: TEAM_GROUP_FIELD,
        label: 'Group',
        type: 'reference',
        validation: { targetCollection: groupCollection },
      },
    ],
  };
}

function toTeamMember(entry: CollectionEntry): TeamMember {
  const { name, role, image } = entry.data;
  return {
    name: String(name ?? ''),
    role: String(role ?? ''),
    image: typeof image === 'object' && image !== null ? (image as MediaValue) : undefined,
  };
}

/**
 * The default team source. It reads the starter collection (or another
 * collection with the same field names, via `collection`); a site whose fields
 * differ writes its own `Source<TeamMember>` against its own generated types.
 */
export function createTeamSource(options: CollectionSourceOptions = {}): Source<TeamMember> {
  return createCollectionSource({
    collection: options.collection ?? STARTER_TEAM_COLLECTION,
    groupField: options.groupField ?? TEAM_GROUP_FIELD,
    query: options.query,
    mapEntry: toTeamMember,
  });
}

const variants = ['four-column', 'three-column'] as const;

export const team = {
  definition: {
    slug: 'team',
    label: 'Team',
    description:
      'Team members pulled from a shared team collection rather than written inline. ' +
      'Scope picks whether the members come from the page\'s group or the whole ' +
      'collection; count caps how many. Variant four-column shows many compact ' +
      'portrait cards in a dense grid; three-column shows fewer, larger cards ' +
      'per row. Use team for the people behind the page; customer quotes belong ' +
      'on the testimonials block.',
    currentVersion: 1,
    versions: [{ version: 1, fields: [variantField(variants), scopeField(), countField()] }],
  } satisfies ApplySeedBlockTypeInput & { description: string },
  variants,
  migrations: {},
  requiredToPublish: [],
  starter: starterTeamCollection,
} satisfies BlockType;

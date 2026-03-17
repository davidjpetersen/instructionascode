import type { GetStaticPaths } from 'astro';

import { createConceptRoute, prerender } from '../../../../endpoints/taxonomy/semanticResponse';
import { getTaxonomyLevelStaticPaths } from '../../../../lib/taxonomyRouteParams';

export { prerender };
export const getStaticPaths: GetStaticPaths = getTaxonomyLevelStaticPaths;

export const GET = createConceptRoute((params) => ({
	taxonomyId: params.taxonomy,
	levelId: params.level,
}));

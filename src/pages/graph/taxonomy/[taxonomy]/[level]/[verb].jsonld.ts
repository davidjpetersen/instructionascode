import type { GetStaticPaths } from 'astro';

import { createConceptRoute, prerender } from '../../../../../endpoints/taxonomy/semanticResponse';
import { getTaxonomyVerbStaticPaths } from '../../../../../lib/taxonomyRouteParams';

export { prerender };
export const getStaticPaths: GetStaticPaths = getTaxonomyVerbStaticPaths;

export const GET = createConceptRoute((params) => ({
	taxonomyId: params.taxonomy,
	levelId: params.level,
	verbId: params.verb,
}));

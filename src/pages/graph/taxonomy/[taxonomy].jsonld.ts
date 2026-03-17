import type { GetStaticPaths } from 'astro';

import { createConceptRoute, prerender } from '../../../endpoints/taxonomy/semanticResponse';
import { getTaxonomyStaticPaths } from '../../../lib/taxonomyRouteParams';

export { prerender };
export const getStaticPaths: GetStaticPaths = getTaxonomyStaticPaths;

export const GET = createConceptRoute((params) => ({
	taxonomyId: params.taxonomy,
}));

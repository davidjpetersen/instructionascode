import { createConceptRoute, prerender } from '../../../../endpoints/taxonomy/semanticResponse';

export { prerender };

export const GET = createConceptRoute((params) => ({
	taxonomyId: params.taxonomy,
	levelId: params.level,
}));

import type { APIRoute } from 'astro';

import {
	CONTEXT_URL,
	getKnowledgeGraph,
	toJsonLdRepresentation,
} from '../../lib/knowledgeGraph';

export const prerender = true;

type PathResolver = (params: Record<string, string | undefined>) => {
	taxonomyId?: string;
	levelId?: string;
	verbId?: string;
};

export function createConceptRoute(pathResolver: PathResolver): APIRoute {
	return async ({ params }) => {
		const graph = await getKnowledgeGraph();
		const { taxonomyId, levelId, verbId } = pathResolver(params);
		const concept = taxonomyId ? graph.resolveConceptByPath(taxonomyId, levelId, verbId) : undefined;

		if (!concept) {
			return new Response(
				JSON.stringify({
					error: 'Not found',
				}),
				{ status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } }
			);
		}

		const headers = new Headers({
			link: `<${CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
			'content-type': 'application/ld+json; charset=utf-8',
		});

		return new Response(JSON.stringify(toJsonLdRepresentation(graph, concept), null, 2), { headers });
	};
}

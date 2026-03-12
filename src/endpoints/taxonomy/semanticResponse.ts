import type { APIRoute } from 'astro';

import { negotiateContentType } from '../../lib/contentNegotiation';
import {
	CONTEXT_URL,
	getKnowledgeGraph,
	toJsonLdRepresentation,
	toJsonRepresentation,
	toTurtleRepresentation,
} from '../../lib/knowledgeGraph';

export const prerender = false;

type PathResolver = (params: Record<string, string | undefined>) => {
	taxonomyId?: string;
	levelId?: string;
	verbId?: string;
};

export function createConceptRoute(pathResolver: PathResolver): APIRoute {
	return async ({ params, request }) => {
		const graph = await getKnowledgeGraph();
		const { taxonomyId, levelId, verbId } = pathResolver(params);
		const concept = taxonomyId ? graph.resolveConceptByPath(taxonomyId, levelId, verbId) : undefined;

		if (!concept) {
			return new Response(
				JSON.stringify({
					error: 'Not found',
				}),
				{
					status: 404,
					headers: {
						'content-type': 'application/json; charset=utf-8',
						vary: 'Accept',
					},
				}
			);
		}

		const mediaType = negotiateContentType(request.headers.get('accept'));
		const headers = new Headers({
			vary: 'Accept',
			link: `<${CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
		});

		switch (mediaType) {
			case 'application/json':
				headers.set('content-type', 'application/json; charset=utf-8');
				return new Response(JSON.stringify(toJsonRepresentation(graph, concept), null, 2), {
					headers,
				});
			case 'text/turtle':
				headers.set('content-type', 'text/turtle; charset=utf-8');
				return new Response(toTurtleRepresentation(graph, concept), { headers });
			case 'text/html':
			case 'application/ld+json':
			default:
				headers.set('content-type', 'application/ld+json; charset=utf-8');
				return new Response(JSON.stringify(toJsonLdRepresentation(graph, concept), null, 2), {
					headers,
				});
		}
	};
}

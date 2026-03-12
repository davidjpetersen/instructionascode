import type { APIRoute } from 'astro';

export const GET: APIRoute = async () =>
	new Response(
		JSON.stringify(
			{
				'@context': {
					skos: 'http://www.w3.org/2004/02/skos/core#',
					iac: 'https://instructionascode.com/ontology/learning#',
					prefLabel: 'skos:prefLabel',
					altLabel: 'skos:altLabel',
					definition: 'skos:definition',
					example: 'skos:example',
					broader: { '@id': 'skos:broader', '@type': '@id' },
					narrower: { '@id': 'skos:narrower', '@type': '@id' },
					inScheme: { '@id': 'skos:inScheme', '@type': '@id' },
					exactMatch: { '@id': 'skos:exactMatch', '@type': '@id' },
					closeMatch: { '@id': 'skos:closeMatch', '@type': '@id' },
					broadMatch: { '@id': 'skos:broadMatch', '@type': '@id' },
					narrowMatch: { '@id': 'skos:narrowMatch', '@type': '@id' },
					hasTopConcept: { '@id': 'skos:hasTopConcept', '@type': '@id' },
					iac_taxonomyOrder: 'iac:taxonomyOrder',
					iac_hasExampleVerb: { '@id': 'iac:hasExampleVerb', '@type': '@id' },
					iac_belongsToLevel: { '@id': 'iac:belongsToLevel', '@type': '@id' },
					iac_cognitiveComplexity: 'iac:cognitiveComplexity',
					iac_mapsApproximatelyTo: { '@id': 'iac:mapsApproximatelyTo', '@type': '@id' },
				},
			},
			null,
			2
		),
		{
			headers: {
				'content-type': 'application/ld+json; charset=utf-8',
				'cache-control': 'public, max-age=3600',
			},
		}
	);

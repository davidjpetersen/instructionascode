import { getKnowledgeGraph } from './knowledgeGraph';

export interface TaxonomyRouteParams {
	taxonomy: string;
}

export interface TaxonomyLevelRouteParams extends TaxonomyRouteParams {
	level: string;
}

export interface TaxonomyVerbRouteParams extends TaxonomyLevelRouteParams {
	verb: string;
}

export async function getTaxonomyStaticPaths() {
	const graph = await getKnowledgeGraph();

	return graph.schemes.map((scheme) => ({
		params: {
			taxonomy: scheme.id,
		},
	}));
}

export async function getTaxonomyLevelStaticPaths() {
	const graph = await getKnowledgeGraph();

	return graph.levels.map((level) => ({
		params: {
			taxonomy: level.taxonomyId,
			level: level.id,
		},
	}));
}

export async function getTaxonomyVerbStaticPaths() {
	const graph = await getKnowledgeGraph();

	return graph.verbs.map((verb) => ({
		params: {
			taxonomy: verb.taxonomyId,
			level: verb.levelId,
			verb: verb.id,
		},
	}));
}

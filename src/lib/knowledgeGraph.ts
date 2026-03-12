import { loadRegistryDefinitions } from './registryLoader';
import type {
	MappingPredicate,
	RegistryMappingInput,
	RegistryTaxonomyInput,
	RegistryVerbInput,
} from './validateRegistry';

export const BASE_URL = 'https://id.instructionascode.com';
export const CONTEXT_URL = `${BASE_URL}/context/taxonomy.jsonld`;
export const IAC_NAMESPACE = 'https://instructionascode.com/ontology/learning#';

export interface TaxonomyMapping {
	property: MappingPredicate;
	targetUri: string;
	targetTaxonomy: string;
	targetLevel?: string;
	targetVerb?: string;
}

export interface TaxonomyScheme {
	kind: 'scheme';
	id: string;
	uri: string;
	label: string;
	altLabels: string[];
	description?: string;
	levelIds: string[];
}

export interface TaxonomyLevel {
	kind: 'level';
	taxonomyId: string;
	id: string;
	key: string;
	uri: string;
	label: string;
	altLabels: string[];
	order: number;
	definition?: string;
	example?: string;
	cognitiveComplexity?: string;
	inScheme: string;
	broader?: string;
	narrower?: string;
	verbIds: string[];
	mappings: TaxonomyMapping[];
}

export interface TaxonomyVerb {
	kind: 'verb';
	taxonomyId: string;
	levelId: string;
	id: string;
	key: string;
	uri: string;
	label: string;
	altLabels: string[];
	definition?: string;
	example?: string;
	inScheme: string;
	belongsToLevel: string;
	mappings: TaxonomyMapping[];
}

export type TaxonomyConcept = TaxonomyScheme | TaxonomyLevel | TaxonomyVerb;

export interface KnowledgeGraph {
	schemes: TaxonomyScheme[];
	levels: TaxonomyLevel[];
	verbs: TaxonomyVerb[];
	getScheme: (taxonomyId: string) => TaxonomyScheme | undefined;
	getLevel: (taxonomyId: string, levelId: string) => TaxonomyLevel | undefined;
	getVerb: (taxonomyId: string, levelId: string, verbId: string) => TaxonomyVerb | undefined;
	getLevelsForTaxonomy: (taxonomyId: string) => TaxonomyLevel[];
	getVerbsForLevel: (taxonomyId: string, levelId: string) => TaxonomyVerb[];
	getChildrenForLevel: (level: TaxonomyLevel) => TaxonomyLevel[];
	getParentForLevel: (level: TaxonomyLevel) => TaxonomyLevel | undefined;
	resolveConceptByPath: (
		taxonomyId: string,
		levelId?: string,
		verbId?: string
	) => TaxonomyConcept | undefined;
}

function taxonomyUri(taxonomyId: string) {
	return `${BASE_URL}/taxonomy/${taxonomyId}`;
}

function levelUri(taxonomyId: string, levelId: string) {
	return `${taxonomyUri(taxonomyId)}/${levelId}`;
}

function verbUri(taxonomyId: string, levelId: string, verbId: string) {
	return `${levelUri(taxonomyId, levelId)}/${verbId}`;
}

function parseMapping(target: string): Pick<TaxonomyMapping, 'targetUri' | 'targetTaxonomy' | 'targetLevel' | 'targetVerb'> {
	const segments = target.split('/').filter(Boolean);
	if (segments.length < 2 || segments.length > 3) {
		throw new Error(`Invalid mapping target "${target}". Expected "taxonomy/level" or "taxonomy/level/verb".`);
	}

	const [targetTaxonomy, targetLevel, targetVerb] = segments;
	return {
		targetUri:
			segments.length === 2
				? levelUri(targetTaxonomy, targetLevel)
				: verbUri(targetTaxonomy, targetLevel, targetVerb),
		targetTaxonomy,
		targetLevel,
		targetVerb,
	};
}

function normalizeMappings(mappings: RegistryMappingInput[] | undefined): TaxonomyMapping[] {
	return (mappings ?? []).map((mapping) => ({
		property: mapping.type,
		...parseMapping(mapping.target),
	}));
}

function buildScheme(registry: RegistryTaxonomyInput): TaxonomyScheme {
	return {
		kind: 'scheme',
		id: registry.taxonomy,
		uri: taxonomyUri(registry.taxonomy),
		label: registry.label,
		altLabels: registry.altLabels ?? [],
		description: registry.description,
		levelIds: registry.levels.map((level) => level.id),
	};
}

function buildLevel(
	registry: RegistryTaxonomyInput,
	level: RegistryTaxonomyInput['levels'][number],
	index: number
): TaxonomyLevel {
	const previous = registry.levels[index - 1];
	const next = registry.levels[index + 1];

	return {
		kind: 'level',
		taxonomyId: registry.taxonomy,
		id: level.id,
		key: `${registry.taxonomy}/${level.id}`,
		uri: levelUri(registry.taxonomy, level.id),
		label: level.label ?? level.id,
		altLabels: level.altLabels ?? [],
		order: level.order,
		definition: level.definition,
		example: level.example,
		cognitiveComplexity: level.cognitiveComplexity,
		inScheme: taxonomyUri(registry.taxonomy),
		broader: previous ? levelUri(registry.taxonomy, previous.id) : undefined,
		narrower: next ? levelUri(registry.taxonomy, next.id) : undefined,
		verbIds: level.verbs?.map((verb) => verb.id) ?? [],
		mappings: normalizeMappings(level.mappings),
	};
}

function buildVerb(
	registry: RegistryTaxonomyInput,
	level: RegistryTaxonomyInput['levels'][number],
	verb: RegistryVerbInput
): TaxonomyVerb {
	return {
		kind: 'verb',
		taxonomyId: registry.taxonomy,
		levelId: level.id,
		id: verb.id,
		key: `${registry.taxonomy}/${level.id}/${verb.id}`,
		uri: verbUri(registry.taxonomy, level.id, verb.id),
		label: verb.label ?? verb.id,
		altLabels: verb.altLabels ?? [],
		definition: verb.definition,
		example: verb.example,
		inScheme: taxonomyUri(registry.taxonomy),
		belongsToLevel: levelUri(registry.taxonomy, level.id),
		mappings: normalizeMappings(verb.mappings),
	};
}

function escapeTurtleLiteral(value: string) {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function appendLiteral(predicate: string, value: string | undefined, statements: string[]) {
	if (value) statements.push(`${predicate} ${escapeTurtleLiteral(value)}`);
}

function appendUriList(predicate: string, values: string[], statements: string[]) {
	for (const value of values) {
		statements.push(`${predicate} <${value}>`);
	}
}

function appendMappings(mappings: TaxonomyMapping[], statements: string[]) {
	for (const mapping of mappings) {
		statements.push(`skos:${mapping.property} <${mapping.targetUri}>`);
	}
}

export function toJsonRepresentation(graph: KnowledgeGraph, concept: TaxonomyConcept) {
	if (concept.kind === 'scheme') {
		return {
			kind: concept.kind,
			id: concept.id,
			uri: concept.uri,
			label: concept.label,
			altLabels: concept.altLabels,
			description: concept.description,
			levels: graph.getLevelsForTaxonomy(concept.id).map((level) => ({
				id: level.id,
				label: level.label,
				uri: level.uri,
				order: level.order,
			})),
		};
	}

	if (concept.kind === 'level') {
		return {
			kind: concept.kind,
			id: concept.id,
			taxonomy: concept.taxonomyId,
			uri: concept.uri,
			label: concept.label,
			altLabels: concept.altLabels,
			order: concept.order,
			definition: concept.definition,
			example: concept.example,
			cognitiveComplexity: concept.cognitiveComplexity,
			broader: concept.broader,
			narrower: concept.narrower,
			inScheme: concept.inScheme,
			exampleVerbs: graph.getVerbsForLevel(concept.taxonomyId, concept.id).map((verb) => ({
				id: verb.id,
				label: verb.label,
				uri: verb.uri,
			})),
			mappings: concept.mappings,
		};
	}

	return {
		kind: concept.kind,
		id: concept.id,
		taxonomy: concept.taxonomyId,
		level: concept.levelId,
		uri: concept.uri,
		label: concept.label,
		altLabels: concept.altLabels,
		definition: concept.definition,
		example: concept.example,
		inScheme: concept.inScheme,
		belongsToLevel: concept.belongsToLevel,
		mappings: concept.mappings,
	};
}

export function toJsonLdRepresentation(graph: KnowledgeGraph, concept: TaxonomyConcept) {
	if (concept.kind === 'scheme') {
		return {
			'@context': CONTEXT_URL,
			'@id': concept.uri,
			'@type': 'skos:ConceptScheme',
			prefLabel: concept.label,
			altLabel: concept.altLabels,
			definition: concept.description,
			hasTopConcept: graph.getLevelsForTaxonomy(concept.id).map((level) => ({ '@id': level.uri })),
		};
	}

	if (concept.kind === 'level') {
		return {
			'@context': CONTEXT_URL,
			'@id': concept.uri,
			'@type': 'skos:Concept',
			prefLabel: concept.label,
			altLabel: concept.altLabels,
			definition: concept.definition,
			example: concept.example,
			broader: concept.broader ? { '@id': concept.broader } : undefined,
			narrower: concept.narrower ? [{ '@id': concept.narrower }] : [],
			inScheme: { '@id': concept.inScheme },
			iac_taxonomyOrder: concept.order,
			iac_cognitiveComplexity: concept.cognitiveComplexity,
			iac_hasExampleVerb: graph.getVerbsForLevel(concept.taxonomyId, concept.id).map((verb) => ({
				'@id': verb.uri,
			})),
			exactMatch: concept.mappings
				.filter((mapping) => mapping.property === 'exactMatch')
				.map((mapping) => ({ '@id': mapping.targetUri })),
			closeMatch: concept.mappings
				.filter((mapping) => mapping.property === 'closeMatch')
				.map((mapping) => ({ '@id': mapping.targetUri })),
			broadMatch: concept.mappings
				.filter((mapping) => mapping.property === 'broadMatch')
				.map((mapping) => ({ '@id': mapping.targetUri })),
			narrowMatch: concept.mappings
				.filter((mapping) => mapping.property === 'narrowMatch')
				.map((mapping) => ({ '@id': mapping.targetUri })),
		};
	}

	return {
		'@context': CONTEXT_URL,
		'@id': concept.uri,
		'@type': 'skos:Concept',
		prefLabel: concept.label,
		altLabel: concept.altLabels,
		definition: concept.definition,
		example: concept.example,
		inScheme: { '@id': concept.inScheme },
		iac_belongsToLevel: { '@id': concept.belongsToLevel },
		exactMatch: concept.mappings
			.filter((mapping) => mapping.property === 'exactMatch')
			.map((mapping) => ({ '@id': mapping.targetUri })),
		closeMatch: concept.mappings
			.filter((mapping) => mapping.property === 'closeMatch')
			.map((mapping) => ({ '@id': mapping.targetUri })),
		broadMatch: concept.mappings
			.filter((mapping) => mapping.property === 'broadMatch')
			.map((mapping) => ({ '@id': mapping.targetUri })),
		narrowMatch: concept.mappings
			.filter((mapping) => mapping.property === 'narrowMatch')
			.map((mapping) => ({ '@id': mapping.targetUri })),
	};
}

export function toTurtleRepresentation(graph: KnowledgeGraph, concept: TaxonomyConcept) {
	const statements: string[] = [];

	if (concept.kind === 'scheme') {
		statements.push('a skos:ConceptScheme');
		appendLiteral('skos:prefLabel', concept.label, statements);
		for (const altLabel of concept.altLabels) {
			appendLiteral('skos:altLabel', altLabel, statements);
		}
		appendLiteral('skos:definition', concept.description, statements);
		appendUriList(
			'skos:hasTopConcept',
			graph.getLevelsForTaxonomy(concept.id).map((level) => level.uri),
			statements
		);
	} else if (concept.kind === 'level') {
		statements.push('a skos:Concept');
		appendLiteral('skos:prefLabel', concept.label, statements);
		for (const altLabel of concept.altLabels) {
			appendLiteral('skos:altLabel', altLabel, statements);
		}
		appendLiteral('skos:definition', concept.definition, statements);
		appendLiteral('skos:example', concept.example, statements);
		if (concept.broader) statements.push(`skos:broader <${concept.broader}>`);
		if (concept.narrower) statements.push(`skos:narrower <${concept.narrower}>`);
		statements.push(`skos:inScheme <${concept.inScheme}>`);
		statements.push(`iac:taxonomyOrder ${concept.order}`);
		appendLiteral('iac:cognitiveComplexity', concept.cognitiveComplexity, statements);
		appendUriList(
			'iac:hasExampleVerb',
			graph.getVerbsForLevel(concept.taxonomyId, concept.id).map((verb) => verb.uri),
			statements
		);
		appendMappings(concept.mappings, statements);
	} else {
		statements.push('a skos:Concept');
		appendLiteral('skos:prefLabel', concept.label, statements);
		for (const altLabel of concept.altLabels) {
			appendLiteral('skos:altLabel', altLabel, statements);
		}
		appendLiteral('skos:definition', concept.definition, statements);
		appendLiteral('skos:example', concept.example, statements);
		statements.push(`skos:inScheme <${concept.inScheme}>`);
		statements.push(`iac:belongsToLevel <${concept.belongsToLevel}>`);
		appendMappings(concept.mappings, statements);
	}

	return [
		'@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
		'@prefix iac: <https://instructionascode.com/ontology/learning#> .',
		`<${concept.uri}>`,
		`  ${statements.join(' ;\n  ')} .`,
	].join('\n');
}

let knowledgeGraphPromise: Promise<KnowledgeGraph> | undefined;

export async function getKnowledgeGraph(): Promise<KnowledgeGraph> {
	if (!knowledgeGraphPromise) {
		knowledgeGraphPromise = buildKnowledgeGraph();
	}

	return knowledgeGraphPromise;
}

async function buildKnowledgeGraph(): Promise<KnowledgeGraph> {
	const registries = await loadRegistryDefinitions();
	const schemes = registries.map(buildScheme);
	const levels = registries.flatMap((registry) => registry.levels.map((level, index) => buildLevel(registry, level, index)));
	const verbs = registries.flatMap((registry) =>
		registry.levels.flatMap((level) => (level.verbs ?? []).map((verb) => buildVerb(registry, level, verb)))
	);

	const schemeIndex = new Map(schemes.map((scheme) => [scheme.id, scheme]));
	const levelIndex = new Map(levels.map((level) => [level.key, level]));
	const verbIndex = new Map(verbs.map((verb) => [verb.key, verb]));

	for (const level of levels) {
		for (const mapping of level.mappings) {
			if (!levelIndex.has(`${mapping.targetTaxonomy}/${mapping.targetLevel}`)) {
				throw new Error(`Level mapping from "${level.uri}" targets unknown concept "${mapping.targetUri}".`);
			}
		}
	}

	for (const verb of verbs) {
		for (const mapping of verb.mappings) {
			if (!mapping.targetVerb || !verbIndex.has(`${mapping.targetTaxonomy}/${mapping.targetLevel}/${mapping.targetVerb}`)) {
				throw new Error(`Verb mapping from "${verb.uri}" targets unknown concept "${mapping.targetUri}".`);
			}
		}
	}

	return {
		schemes,
		levels,
		verbs,
		getScheme(taxonomyId) {
			return schemeIndex.get(taxonomyId);
		},
		getLevel(taxonomyId, levelId) {
			return levelIndex.get(`${taxonomyId}/${levelId}`);
		},
		getVerb(taxonomyId, levelId, verbId) {
			return verbIndex.get(`${taxonomyId}/${levelId}/${verbId}`);
		},
		getLevelsForTaxonomy(taxonomyId) {
			return levels.filter((level) => level.taxonomyId === taxonomyId).sort((left, right) => left.order - right.order);
		},
		getVerbsForLevel(taxonomyId, levelId) {
			return verbs.filter((verb) => verb.taxonomyId === taxonomyId && verb.levelId === levelId);
		},
		getChildrenForLevel(level) {
			return level.narrower ? [levels.find((candidate) => candidate.uri === level.narrower)!].filter(Boolean) : [];
		},
		getParentForLevel(level) {
			return level.broader ? levels.find((candidate) => candidate.uri === level.broader) : undefined;
		},
		resolveConceptByPath(taxonomyId, levelId, verbId) {
			if (!levelId) return schemeIndex.get(taxonomyId);
			if (!verbId) return levelIndex.get(`${taxonomyId}/${levelId}`);
			return verbIndex.get(`${taxonomyId}/${levelId}/${verbId}`);
		},
	};
}

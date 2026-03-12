export type MappingPredicate = 'exactMatch' | 'closeMatch' | 'broadMatch' | 'narrowMatch';

export interface RegistryMappingInput {
	type: MappingPredicate;
	target: string;
}

export interface RegistryVerbInput {
	id: string;
	label?: string;
	altLabels?: string[];
	definition?: string;
	example?: string;
	mappings?: RegistryMappingInput[];
}

export interface RegistryLevelInput {
	id: string;
	label?: string;
	altLabels?: string[];
	order: number;
	definition?: string;
	example?: string;
	cognitiveComplexity?: string;
	verbs?: Array<string | RegistryVerbInput>;
	mappings?: RegistryMappingInput[];
}

export interface RegistryTaxonomyInput {
	taxonomy: string;
	label: string;
	description?: string;
	altLabels?: string[];
	levels: RegistryLevelInput[];
}

function expectString(value: unknown, field: string) {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`Expected "${field}" to be a non-empty string.`);
	}
}

function expectIdentifier(value: unknown, field: string) {
	if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
		throw new Error(`Expected "${field}" to be a non-empty string or number.`);
	}
}

function expectStringArray(value: unknown, field: string) {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
		throw new Error(`Expected "${field}" to be an array of non-empty strings.`);
	}
}

function expectMappings(value: unknown, field: string) {
	if (!Array.isArray(value)) {
		throw new Error(`Expected "${field}" to be an array.`);
	}

	for (const [index, mapping] of value.entries()) {
		if (!mapping || typeof mapping !== 'object') {
			throw new Error(`Expected "${field}[${index}]" to be an object.`);
		}

		const candidate = mapping as Record<string, unknown>;
		const type = candidate.type;
		const target = candidate.target;
		if (!['exactMatch', 'closeMatch', 'broadMatch', 'narrowMatch'].includes(String(type))) {
			throw new Error(`Invalid mapping type at "${field}[${index}].type".`);
		}
		expectString(target, `${field}[${index}].target`);
	}
}

function slugify(input: string) {
	return input
		.trim()
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeVerb(verb: string | RegistryVerbInput, field: string): RegistryVerbInput {
	if (typeof verb === 'string') {
		expectString(verb, field);
		return { id: slugify(verb), label: toTitleCase(verb) };
	}

	if (!verb || typeof verb !== 'object') {
		throw new Error(`Expected "${field}" to be a string or object.`);
	}

		expectIdentifier(verb.id, `${field}.id`);
	if (verb.label !== undefined) expectString(verb.label, `${field}.label`);
	if (verb.altLabels !== undefined) expectStringArray(verb.altLabels, `${field}.altLabels`);
	if (verb.definition !== undefined) expectString(verb.definition, `${field}.definition`);
	if (verb.example !== undefined) expectString(verb.example, `${field}.example`);
	if (verb.mappings !== undefined) expectMappings(verb.mappings, `${field}.mappings`);
	return {
			id: slugify(String(verb.id)),
		label: verb.label ?? toTitleCase(verb.id),
		altLabels: verb.altLabels,
		definition: verb.definition,
		example: verb.example,
		mappings: verb.mappings,
	};
}

export function toTitleCase(input: string) {
	return input
		.replace(/[-_]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function validateRegistry(raw: unknown, sourceName: string): RegistryTaxonomyInput {
	if (!raw || typeof raw !== 'object') {
		throw new Error(`Registry "${sourceName}" must be an object.`);
	}

	const candidate = raw as Record<string, unknown>;
	expectString(candidate.taxonomy, `${sourceName}.taxonomy`);
	expectString(candidate.label, `${sourceName}.label`);
	if (candidate.description !== undefined) expectString(candidate.description, `${sourceName}.description`);
	if (candidate.altLabels !== undefined) expectStringArray(candidate.altLabels, `${sourceName}.altLabels`);

	if (!Array.isArray(candidate.levels) || candidate.levels.length === 0) {
		throw new Error(`Registry "${sourceName}" must define at least one level.`);
	}

	const seenLevels = new Set<string>();
	const levels = candidate.levels.map((level, levelIndex) => {
		if (!level || typeof level !== 'object') {
			throw new Error(`Expected "${sourceName}.levels[${levelIndex}]" to be an object.`);
		}

		const levelRecord = level as Record<string, unknown>;
		expectIdentifier(levelRecord.id, `${sourceName}.levels[${levelIndex}].id`);
		const levelId = slugify(String(levelRecord.id));
		if (seenLevels.has(levelId)) {
			throw new Error(`Duplicate level id "${levelId}" in registry "${sourceName}".`);
		}
		seenLevels.add(levelId);

		if (levelRecord.label !== undefined) expectString(levelRecord.label, `${sourceName}.levels[${levelIndex}].label`);
		if (levelRecord.altLabels !== undefined) {
			expectStringArray(levelRecord.altLabels, `${sourceName}.levels[${levelIndex}].altLabels`);
		}
		if (typeof levelRecord.order !== 'number' || Number.isNaN(levelRecord.order)) {
			throw new Error(`Expected "${sourceName}.levels[${levelIndex}].order" to be a number.`);
		}
		if (levelRecord.definition !== undefined) {
			expectString(levelRecord.definition, `${sourceName}.levels[${levelIndex}].definition`);
		}
		if (levelRecord.example !== undefined) {
			expectString(levelRecord.example, `${sourceName}.levels[${levelIndex}].example`);
		}
		if (levelRecord.cognitiveComplexity !== undefined) {
			expectString(
				levelRecord.cognitiveComplexity,
				`${sourceName}.levels[${levelIndex}].cognitiveComplexity`
			);
		}
		if (levelRecord.mappings !== undefined) {
			expectMappings(levelRecord.mappings, `${sourceName}.levels[${levelIndex}].mappings`);
		}

		const seenVerbs = new Set<string>();
		const verbs = Array.isArray(levelRecord.verbs)
			? levelRecord.verbs.map((verb, verbIndex) => {
					const normalized = normalizeVerb(
						verb as string | RegistryVerbInput,
						`${sourceName}.levels[${levelIndex}].verbs[${verbIndex}]`
					);
					if (seenVerbs.has(normalized.id)) {
						throw new Error(
							`Duplicate verb id "${normalized.id}" in level "${levelId}" of registry "${sourceName}".`
						);
					}
					seenVerbs.add(normalized.id);
					return normalized;
				})
			: [];

		return {
			id: levelId,
			label: levelRecord.label ? String(levelRecord.label) : toTitleCase(levelId),
			altLabels: levelRecord.altLabels as string[] | undefined,
			order: Number(levelRecord.order),
			definition: levelRecord.definition as string | undefined,
			example: levelRecord.example as string | undefined,
			cognitiveComplexity: levelRecord.cognitiveComplexity as string | undefined,
			verbs,
			mappings: levelRecord.mappings as RegistryMappingInput[] | undefined,
		};
	});

	return {
		taxonomy: slugify(String(candidate.taxonomy)),
		label: String(candidate.label),
		description: candidate.description as string | undefined,
		altLabels: candidate.altLabels as string[] | undefined,
		levels: levels.sort((left, right) => left.order - right.order),
	};
}

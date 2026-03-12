import YAML from 'yaml';

import { validateRegistry, type RegistryTaxonomyInput } from './validateRegistry';

const registrySources = import.meta.glob('../../registry/*.yaml', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

export async function loadRegistryDefinitions(): Promise<RegistryTaxonomyInput[]> {
	const registries = Object.entries(registrySources).map(([path, source]) => {
		const parsed = YAML.parse(source);
		return validateRegistry(parsed, path);
	});

	const seenTaxonomies = new Set<string>();
	for (const registry of registries) {
		if (seenTaxonomies.has(registry.taxonomy)) {
			throw new Error(`Duplicate taxonomy "${registry.taxonomy}" found across registry files.`);
		}
		seenTaxonomies.add(registry.taxonomy);
	}

	return registries.sort((left, right) => left.label.localeCompare(right.label));
}

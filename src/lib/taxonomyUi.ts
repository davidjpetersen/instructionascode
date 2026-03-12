import type { SidebarItem } from '@astrojs/starlight/schemas/sidebar';

import type { KnowledgeGraph, TaxonomyScheme } from './knowledgeGraph';

export function buildTaxonomySidebar(graph: KnowledgeGraph): SidebarItem[] {
	return [
		{
			label: 'Registry',
			items: [
				{ label: 'Overview', link: '/' },
				{ label: 'Taxonomy Index', link: '/taxonomy/' },
			],
		},
		{
			label: 'Taxonomies',
			items: graph.schemes.map((scheme: TaxonomyScheme) => ({
				label: scheme.label,
				link: `/taxonomy/${scheme.id}/`,
			})),
		},
	];
}

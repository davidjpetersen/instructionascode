// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTelescope from 'starlight-telescope';

// https://astro.build/config
export default defineConfig({
	site: 'https://id.instructionascode.com',
	output: 'static',
	integrations: [
		starlight({
			title: 'Instruction as Code',
			description:
				'Instruction as Code documentation, registries, and linked-data services for learning systems.',
			sidebar: [
				{
					label: 'Registry',
					items: [
						{ label: 'Overview', slug: '' },
						{ label: 'Taxonomy Index', link: '/taxonomy/' },
					],
				},
			],
			plugins: [starlightTelescope()],
		}),
	],
});

import { defineMiddleware } from 'astro:middleware';

import { shouldServeHtml } from './lib/contentNegotiation';

export const onRequest = defineMiddleware(async (context, next) => {
	if (context.url.pathname.startsWith('/taxonomy/') && !shouldServeHtml(context.request.headers.get('accept'))) {
		const rewriteTarget = new URL(context.url);
		rewriteTarget.pathname = `/graph${context.url.pathname}`;
		return next(rewriteTarget);
	}

	return next();
});

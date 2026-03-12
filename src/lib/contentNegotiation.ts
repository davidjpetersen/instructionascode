export const SUPPORTED_MEDIA_TYPES = [
	'text/html',
	'application/ld+json',
	'application/json',
	'text/turtle',
] as const;

export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

interface AcceptEntry {
	type: string;
	q: number;
	order: number;
}

function parseAcceptHeader(header: string | null): AcceptEntry[] {
	if (!header || header.trim() === '') {
		return [{ type: '*/*', q: 1, order: 0 }];
	}

	return header
		.split(',')
		.map((entry, index) => {
			const [typePart, ...params] = entry.trim().split(';');
			const qParam = params.find((param) => param.trim().startsWith('q='));
			const q = qParam ? Number(qParam.trim().slice(2)) : 1;
			return {
				type: typePart.trim().toLowerCase(),
				q: Number.isFinite(q) ? q : 1,
				order: index,
			};
		})
		.filter((entry) => entry.type);
}

function matches(requested: string, supported: SupportedMediaType) {
	if (requested === supported || requested === '*/*') return true;

	const [requestedType, requestedSubType] = requested.split('/');
	const [supportedType, supportedSubType] = supported.split('/');
	return requestedType === supportedType && requestedSubType === '*'
		? true
		: requestedType === '*' && requestedSubType === supportedSubType;
}

export function negotiateContentType(acceptHeader: string | null): SupportedMediaType {
	const parsed = parseAcceptHeader(acceptHeader).sort((left, right) => {
		if (right.q !== left.q) return right.q - left.q;
		return left.order - right.order;
	});

	const wildcard = parsed.find((entry) => entry.type === '*/*');
	if (wildcard && parsed.length === 1) {
		return 'application/ld+json';
	}

	for (const entry of parsed) {
		for (const supported of SUPPORTED_MEDIA_TYPES) {
			if (matches(entry.type, supported)) {
				return supported;
			}
		}
	}

	return 'application/ld+json';
}

export function shouldServeHtml(acceptHeader: string | null) {
	return negotiateContentType(acceptHeader) === 'text/html';
}

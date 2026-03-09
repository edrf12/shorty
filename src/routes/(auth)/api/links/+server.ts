import * as db from '$lib/server/db';
// @ts-expect-error Follow docs for this
import mne from 'mnemonic.js';

export async function POST({ request, locals }) {
	const { original_url, short_url, expires_at, expires_in } = await request.json();

	if (!original_url) {
		return new Response("Can't shorten no url", { status: 400 });
	}
	let slug;

	if (locals.user.roles) {
		if (!locals.user.roles.includes('link:create')) {
			return new Response("You don't have the required role link:create", { status: 403 });
		}

		if (locals.user.roles.includes('link:custom') && short_url) {
			slug = short_url;
		} else {
			slug = new mne(32).toWords().join('-');
		}
	} else {
		slug = short_url ? short_url : new mne(32).toWords().join('-');
	}

	let link;
	try {
		link = db.create_link({
			original_url,
			short_url: slug,
			created_by: locals.user.sub,
			expires_at,
			expires_in
		});
	} catch (err: any) {
		if (err.message == 'UNIQUE constraint failed: links.short_url') {
			return new Response('The short url must be unique.', { status: 409 });
		}
	}

	if (!link) {
		return new Response('The link could not be created', { status: 500 });
	}
	return new Response(JSON.stringify(link), {
		status: 201,
		headers: { 'Content-Type': 'application/json' }
	});
}

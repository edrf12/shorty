import { get_by_short, Link } from '$lib/server/db';
import { redirect, error } from '@sveltejs/kit';

export function load({ params }) {
	const link: Link | null = get_by_short(params.short);

	if (!link) {
		error(404, 'Link not found');
	}

	if (link.expired) {
		error(410, 'Link expired');
	}

	redirect(302, link.original_url);
}

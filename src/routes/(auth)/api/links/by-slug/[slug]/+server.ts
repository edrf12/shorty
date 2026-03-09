import * as db from '$lib/server/db';
import type { Link } from '$lib/server/db';
import { check_role_user } from '$lib/server/auth';

export async function GET({ locals, params }) {
	const { slug } = params;
	const check = check_role_user(locals.user.sub, locals.user.roles, 'link:read');

	if (check === false) {
		return new Response('Forbidden', { status: 403 });
	}

	const link: Link | null = db.get_by_short(slug, check);

	if (!link) {
		return new Response('Link not found', { status: 404 });
	}

	return new Response(JSON.stringify(link), { status: 200 });
}

export async function PATCH({ locals, params, request }) {
	const { slug } = params;
	const update: Partial<Link> = await request.json();

	const check = check_role_user(locals.user.sub, locals.user.roles, 'link:update');

	if (check === false) {
		return new Response('Forbidden', { status: 403 });
	}

	const result = db.update_by_short(slug, update, check);

	if (result) {
		return new Response('Link updated', { status: 200 });
	} else {
		return new Response('Link not found', { status: 404 });
	}
}

export async function DELETE({ locals, params }) {
	const { slug } = params;
	const check = check_role_user(locals.user.sub, locals.user.roles, 'link:delete');

	if (check === false) {
		return new Response('Forbidden', { status: 403 });
	}

	const result = db.delete_by_short(slug, check);

	if (result) {
		return new Response('Link deleted', { status: 200 });
	} else {
		return new Response('Link not found', { status: 404 });
	}
}

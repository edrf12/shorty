import * as db from '$lib/server/db';
import type { Link } from '$lib/server/db';
import { check_role_user } from '$lib/server/auth';

export async function GET({ locals, params }) {
	const { name } = params;

	const check = check_role_user(locals.user.sub, locals.user.roles, 'link:read');

	if (check === false) {
		return new Response('Forbidden', { status: 403 });
	}

	const user: string = db.get_by_username(name);

	if (!check?.includes(user)) {
		return new Response('Forbidden', { status: 403 });
	}

	return new Response(JSON.stringify(link), { status: 200 });
}

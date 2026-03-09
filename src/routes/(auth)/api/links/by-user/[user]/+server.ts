import * as db from '$lib/server/db';
import { check_role_user } from '$lib/server/auth.js';

export function GET({ locals, params, url }) {
	// TODO: Implement @me, find user by cookie. Admins can view any user
	// TODO: Implement pagination
	// TODO: Implement sorting
	// TODO: Implement filtering
	// TODO: Implement search
	const check = check_role_user(locals.user.sub, locals.user.roles, 'link:read');
	const user = params.user == '@me' ? locals.user.sub : params.user;

	if (check !== undefined && (check === false || !check?.includes(user))) {
		return new Response('Forbidden', { status: 403 });
	}

	// const { page, limit, sort, filter, search } = url.searchParams;

	const links = db.get_user_links(user);
	return new Response(JSON.stringify(links));
}

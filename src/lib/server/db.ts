import { Database } from 'bun:sqlite';
import { migrate } from './migrate';
import { DB_FILE } from '$env/static/private';

const db = new Database(DB_FILE || ':memory:');

// Enable WAL mode for better performance
db.run('PRAGMA journal_mode = WAL;');

// Migrate DB
migrate(db);

const statements = {
	create: db.query(
		'INSERT INTO links (original_url, short_url, created_by, expires_at, expires_in) VALUES (?, ?, ?, ?, ?);'
	),
	get_by_id: db.query('SELECT * FROM links WHERE id = ?'),
	get_by_id_user: db.query(
		'SELECT * FROM links WHERE id = ? AND created_by IN (SELECT value FROM json_each(?))'
	),
	get_by_short: db.query('SELECT * FROM links WHERE short_url = ?'),
	get_by_short_user: db.query(
		'SELECT * FROM links WHERE short_url = ? AND created_by IN (SELECT value FROM json_each(?))'
	),
	get_by_user: db.query('SELECT * FROM links WHERE created_by = ?'),
	delete_by_id: db.query('DELETE FROM links WHERE id = ?'),
	delete_by_id_user: db.query(
		'DELETE FROM links WHERE id = ? AND created_by IN (SELECT value FROM json_each(?))'
	),
	delete_by_short: db.query('DELETE FROM links WHERE short_url = ?'),
	delete_by_short_user: db.query(
		'DELETE FROM links WHERE short_url = ? AND created_by IN (SELECT value FROM json_each(?))'
	),
	get_by_username: db.query('SELECT id FROM users WHERE preferred_username = ?'),
	update_username: db.query(
		'INSERT INTO users (id, preferred_username) VALUES (?2, ?1) ON CONFLICT (id) DO UPDATE SET preferred_username = ?1'
	)
};

export class Link {
	id: number;
	original_url: string;
	short_url: string;
	created_by: string;
	created_at: number;
	expires_at: number | null;
	expires_in: number | null;

	get expired(): boolean {
		if ((this.expires_at && this.expires_at < Date.now()) || this.expires_in === 0) {
			return true;
		}
		return false;
	}
}

export function create_link(
	link: Omit<Link, 'id' | 'created_at' | 'expired' | 'update' | 'delete'>
): Link | null {
	const status = statements.create
		.as(Link)
		.run(
			link.original_url,
			link.short_url,
			link.created_by,
			link.expires_at,
			link.expires_in
		).changes;

	return status === 1 ? get_by_short(link.short_url) : null;
}

export function delete_by_id(id: number, check_user?: Array<string>): boolean {
	const result = check_user
		? statements.delete_by_id_user.run(id, JSON.stringify(check_user))
		: statements.delete_by_id.run(id);
	return result.changes === 1;
}

export function delete_by_short(shortUrl: string, check_user?: Array<string>): boolean {
	const result = check_user
		? statements.delete_by_short_user.run(shortUrl, JSON.stringify(check_user))
		: statements.delete_by_short.run(shortUrl);
	return result.changes === 1;
}

export function update_by_id(id: number, link: Partial<Link>, check_user?: Array<string>): boolean {
	let statement = 'UPDATE links SET';

	Object.entries(link).forEach(([key, value]) => {
		if (value !== undefined) {
			statement += ` ${key} = ?,`;
		}
	});

	statement = statement.slice(0, -1);

	statement += ` WHERE id = ${id}`;

	if (check_user) {
		statement += ` AND created_by IN (SELECT value FROM json_each(?))`;
	}

	const args = Object.values(link);
	args.push(JSON.stringify(check_user));
	return db.run(statement, args).changes === 1;
}

export function update_by_short(
	shortUrl: string,
	link: Partial<Link>,
	check_user?: Array<string>
): boolean {
	let statement = 'UPDATE links SET';

	Object.entries(link).forEach(([key, value]) => {
		if (value !== undefined) {
			statement += ` ${key} = ?,`;
		}
	});

	statement = statement.slice(0, -1);

	statement += ` WHERE short_url = '${shortUrl}'`;

	if (check_user) {
		statement += ` AND created_by IN (SELECT value FROM json_each(?))`;
	}

	const args = Object.values(link);
	args.push(JSON.stringify(check_user));
	return db.run(statement, args).changes === 1;
}

export function get_by_id(id: number, check_user?: Array<string>): Link | null {
	return check_user
		? statements.get_by_id_user.as(Link).get(id, JSON.stringify(check_user))
		: statements.get_by_id.as(Link).get(id);
}

export function get_by_short(shortUrl: string, check_user?: Array<string>): Link | null {
	return check_user
		? statements.get_by_short_user.as(Link).get(shortUrl, JSON.stringify(check_user))
		: statements.get_by_short.as(Link).get(shortUrl);
}

export function get_user_links(user: string): Link[] {
	return statements.get_by_user.as(Link).all(user);
}

// export function get_by_username(username: string): string | null {
// 	return statements.get_by_username.as(String).get(username);
// }

export function update_username(id: string, username: string): boolean {
	return statements.update_username.run(username, id).changes === 1;
}

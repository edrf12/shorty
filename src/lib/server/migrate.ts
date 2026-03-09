import type Database from 'bun:sqlite';

const migrations = [
	`CREATE TABLE IF NOT EXISTS users (
	  id TEXT PRIMARY KEY,
		preferred_username TEXT UNIQUE
	);
	CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL,
    short_url TEXT UNIQUE NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    expires_at INTEGER,
    expires_in INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_short_url ON links(short_url);
  CREATE INDEX IF NOT EXISTS idx_created_by on links(created_by);
  CREATE INDEX IF NOT EXISTS idx_username on users(preferred_username)`
	// `ALTER TABLE users ADD COLUMN name TEXT`,
	// `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
];

export function migrate(db: Database) {
	db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

	const applied = new Set(
		db
			.query<{ id: number }, []>('SELECT id FROM migrations')
			.all()
			.map((r) => r.id)
	);

	const run = db.transaction(() => {
		for (let i = 0; i < migrations.length; i++) {
			if (!applied.has(i)) {
				db.run(migrations[i]);
				db.run('INSERT INTO migrations (id) VALUES (?)', [i]);
			}
		}
	});

	run();
}

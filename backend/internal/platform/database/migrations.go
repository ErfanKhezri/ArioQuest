package database

// migrations change the schema step by step. Never edit or reorder one that has
// shipped; add a new one at the end instead.
var migrations = []string{
	// 1: accounts and sign-in sessions.
	`CREATE TABLE users (
		id            INTEGER PRIMARY KEY,
		name          TEXT    NOT NULL,
		email         TEXT    NOT NULL UNIQUE,
		password_hash TEXT    NOT NULL,
		created_at    INTEGER NOT NULL
	);
	CREATE TABLE sessions (
		token_hash TEXT    PRIMARY KEY,
		user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		expires_at INTEGER NOT NULL
	);`,
}

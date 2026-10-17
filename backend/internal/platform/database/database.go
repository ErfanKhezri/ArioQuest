// Package database opens the SQLite database and keeps its tables up to date.
package database

import (
	"database/sql"
	"errors"
	"fmt"

	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

// Open opens (or creates) the database file at path and applies any pending migrations.
func Open(path string) (*sql.DB, error) {
	// The _pragma options turn on foreign keys, allow reading while writing (WAL),
	// and wait up to 5 seconds instead of failing when the database is busy.
	connectionString := "file:" + path +
		"?_pragma=foreign_keys(1)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(5000)"

	sqlDatabase, err := sql.Open("sqlite", connectionString)
	if err != nil {
		return nil, err
	}

	// SQLite allows one writer at a time; a single connection avoids "database is locked".
	sqlDatabase.SetMaxOpenConns(1)

	err = migrate(sqlDatabase)
	if err != nil {
		sqlDatabase.Close()
		return nil, err
	}
	return sqlDatabase, nil
}

// IsUniqueViolation reports whether err comes from inserting a duplicate into a UNIQUE column.
func IsUniqueViolation(err error) bool {
	var sqliteError *sqlite.Error
	if !errors.As(err, &sqliteError) {
		return false
	}
	return sqliteError.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE
}

// migrate applies the migrations the database has not seen yet. SQLite's
// user_version holds how many have been applied, so each one runs exactly once.
func migrate(sqlDatabase *sql.DB) error {
	var appliedCount int
	err := sqlDatabase.QueryRow(`PRAGMA user_version`).Scan(&appliedCount)
	if err != nil {
		return err
	}

	for index := appliedCount; index < len(migrations); index++ {
		migrationNumber := index + 1
		err := applyMigration(sqlDatabase, migrations[index], migrationNumber)
		if err != nil {
			return fmt.Errorf("migration %d: %w", migrationNumber, err)
		}
	}
	return nil
}

// applyMigration runs one migration and records it in user_version. Both happen
// in one transaction, so a failed migration leaves the database unchanged.
func applyMigration(sqlDatabase *sql.DB, migration string, migrationNumber int) error {
	transaction, err := sqlDatabase.Begin()
	if err != nil {
		return err
	}
	// Rollback does nothing after a successful Commit, so it is safe to always call.
	defer transaction.Rollback()

	_, err = transaction.Exec(migration)
	if err != nil {
		return err
	}

	_, err = transaction.Exec(fmt.Sprintf(`PRAGMA user_version = %d`, migrationNumber))
	if err != nil {
		return err
	}

	return transaction.Commit()
}

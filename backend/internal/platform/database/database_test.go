package database

import (
	"path/filepath"
	"testing"
)

func TestOpenAppliesMigrationsOnce(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")

	// The first open creates the tables. The second open must not run the
	// migrations again (it would fail with "table users already exists").
	openAndCheckVersion(t, path)
	openAndCheckVersion(t, path)
}

func openAndCheckVersion(t *testing.T, path string) {
	t.Helper()

	sqlDatabase, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDatabase.Close()

	var version int
	err = sqlDatabase.QueryRow(`PRAGMA user_version`).Scan(&version)
	if err != nil {
		t.Fatal(err)
	}
	if version != len(migrations) {
		t.Fatalf("user_version = %d, want %d", version, len(migrations))
	}
}

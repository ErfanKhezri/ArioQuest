package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"arioquest/backend/internal/platform/database"
)

// Repository is everything the service needs from storage. Session tokens are
// only ever stored as hashes.
type Repository interface {
	CreateUser(ctx context.Context, user User) (User, error)
	FindUserByEmail(ctx context.Context, email string) (User, error)
	CreateSession(ctx context.Context, tokenHash string, userID int64, expiresAt time.Time) error
	FindUserBySession(ctx context.Context, tokenHash string, now time.Time) (User, error)
	DeleteSession(ctx context.Context, tokenHash string) error
}

// SQLiteRepository is the Repository that stores data in SQLite.
type SQLiteRepository struct {
	sqlDatabase *sql.DB
}

func NewSQLiteRepository(sqlDatabase *sql.DB) *SQLiteRepository {
	return &SQLiteRepository{sqlDatabase: sqlDatabase}
}

// CreateUser saves a new user and returns it with its ID filled in.
// It returns ErrEmailTaken when the email already has an account.
func (repository *SQLiteRepository) CreateUser(ctx context.Context, user User) (User, error) {
	result, err := repository.sqlDatabase.ExecContext(ctx,
		`INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
		user.Name, user.Email, user.PasswordHash, user.CreatedAt.Unix(),
	)
	if database.IsUniqueViolation(err) {
		return User{}, ErrEmailTaken
	}
	if err != nil {
		return User{}, err
	}

	user.ID, err = result.LastInsertId()
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (repository *SQLiteRepository) FindUserByEmail(ctx context.Context, email string) (User, error) {
	row := repository.sqlDatabase.QueryRowContext(ctx,
		`SELECT id, name, email, password_hash, created_at
		 FROM users
		 WHERE email = ?`,
		email,
	)
	return readUser(row)
}

func (repository *SQLiteRepository) CreateSession(ctx context.Context, tokenHash string, userID int64, expiresAt time.Time) error {
	_, err := repository.sqlDatabase.ExecContext(ctx,
		`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
		tokenHash, userID, expiresAt.Unix(),
	)
	return err
}

// FindUserBySession returns the owner of a session that has not expired at now.
func (repository *SQLiteRepository) FindUserBySession(ctx context.Context, tokenHash string, now time.Time) (User, error) {
	row := repository.sqlDatabase.QueryRowContext(ctx,
		`SELECT users.id, users.name, users.email, users.password_hash, users.created_at
		 FROM sessions
		 JOIN users ON users.id = sessions.user_id
		 WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
		tokenHash, now.Unix(),
	)
	return readUser(row)
}

func (repository *SQLiteRepository) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := repository.sqlDatabase.ExecContext(ctx,
		`DELETE FROM sessions WHERE token_hash = ?`,
		tokenHash,
	)
	return err
}

// readUser copies one row of the users table into a User.
// It returns errNotFound when the query found no row.
func readUser(row *sql.Row) (User, error) {
	var user User
	var createdAtUnix int64
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &createdAtUnix)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, errNotFound
	}
	if err != nil {
		return User{}, err
	}

	user.CreatedAt = time.Unix(createdAtUnix, 0)
	return user, nil
}

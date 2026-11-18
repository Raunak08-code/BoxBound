package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/darrstudios/boxbound/internal/engine"
	_ "github.com/lib/pq"
)

type Store struct {
	db *sql.DB
}

type Player struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"displayName"`
	CreatedAt   time.Time `json:"createdAt"`
}

type LevelProgress struct {
	PlayerID   string    `json:"playerId"`
	LevelID    int       `json:"levelId"`
	Unlocked   bool      `json:"unlocked"`
	Completed  bool      `json:"completed"`
	BestMoves  *int      `json:"bestMoves,omitempty"`
	BestPushes *int      `json:"bestPushes,omitempty"`
	BestTimeMs *int64    `json:"bestTimeMs,omitempty"`
	Stars      int       `json:"stars"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type LeaderboardEntry struct {
	PlayerID    string    `json:"playerId"`
	DisplayName string    `json:"displayName"`
	LevelID     int       `json:"levelId"`
	BestMoves   int       `json:"bestMoves"`
	BestPushes  int       `json:"bestPushes"`
	BestTimeMs  int64     `json:"bestTimeMs"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CompletionRecord struct {
	PlayerID     string
	DisplayName  string
	LevelID      int
	Moves        int
	Pushes       int
	ElapsedMs    int64
	Stars        int
	MoveSequence []engine.Direction
}

func Open(ctx context.Context, dsn string) (*Store, error) {
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open postgres connection: %w", err)
	}
	conn.SetMaxOpenConns(16)
	conn.SetMaxIdleConns(4)
	conn.SetConnMaxLifetime(30 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := conn.PingContext(pingCtx); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	return &Store{db: conn}, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *Store) Migrate(ctx context.Context, migrationSQL string) error {
	if _, err := s.db.ExecContext(ctx, migrationSQL); err != nil {
		return fmt.Errorf("apply postgres schema: %w", err)
	}
	return nil
}

func (s *Store) SeedLevels(ctx context.Context, levels []engine.LevelDefinition) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin seed levels tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO levels (
			id, name, difficulty, theme, optimal_moves,
			difficulty_scale, is_difficulty_step, box_count, layout_json
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			difficulty = EXCLUDED.difficulty,
			theme = EXCLUDED.theme,
			optimal_moves = EXCLUDED.optimal_moves,
			difficulty_scale = EXCLUDED.difficulty_scale,
			is_difficulty_step = EXCLUDED.is_difficulty_step,
			box_count = EXCLUDED.box_count,
			layout_json = EXCLUDED.layout_json
	`)
	if err != nil {
		return fmt.Errorf("prepare seed levels stmt: %w", err)
	}
	defer stmt.Close()

	for _, lvl := range levels {
		parsed := engine.ParseLevel(lvl)
		layoutJSON, err := json.Marshal(lvl.Layout)
		if err != nil {
			return fmt.Errorf("marshal layout for level %d: %w", lvl.ID, err)
		}
		if _, err := stmt.ExecContext(
			ctx,
			lvl.ID,
			lvl.Name,
			lvl.Difficulty,
			lvl.Theme,
			lvl.OptimalMoves,
			lvl.DifficultyScale,
			lvl.IsDifficultyStep,
			len(parsed.Boxes),
			string(layoutJSON),
		); err != nil {
			return fmt.Errorf("upsert level %d: %w", lvl.ID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit seed levels tx: %w", err)
	}
	return nil
}

func (s *Store) UpsertPlayer(ctx context.Context, id, displayName string) (Player, error) {
	var p Player
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO players (id, display_name)
		VALUES ($1, $2)
		ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
		RETURNING id, display_name, created_at
	`, id, displayName).Scan(&p.ID, &p.DisplayName, &p.CreatedAt)
	if err != nil {
		return Player{}, fmt.Errorf("upsert player: %w", err)
	}
	return p, nil
}

func (s *Store) GetProgress(ctx context.Context, playerID string) ([]LevelProgress, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT player_id, level_id, unlocked, completed,
		       best_moves, best_pushes, best_time_ms, stars, updated_at
		FROM player_progress
		WHERE player_id = $1
		ORDER BY level_id ASC
	`, playerID)
	if err != nil {
		return nil, fmt.Errorf("query player progress: %w", err)
	}
	defer rows.Close()

	items := make([]LevelProgress, 0)
	for rows.Next() {
		var item LevelProgress
		var bestMoves sql.NullInt64
		var bestPushes sql.NullInt64
		var bestTime sql.NullInt64

		if err := rows.Scan(
			&item.PlayerID,
			&item.LevelID,
			&item.Unlocked,
			&item.Completed,
			&bestMoves,
			&bestPushes,
			&bestTime,
			&item.Stars,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan player progress: %w", err)
		}
		if bestMoves.Valid {
			v := int(bestMoves.Int64)
			item.BestMoves = &v
		}
		if bestPushes.Valid {
			v := int(bestPushes.Int64)
			item.BestPushes = &v
		}
		if bestTime.Valid {
			v := bestTime.Int64
			item.BestTimeMs = &v
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate player progress: %w", err)
	}
	return items, nil
}

func (s *Store) StartSession(ctx context.Context, playerID string, levelID int) (int64, error) {
	var sessionID int64
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO game_sessions (player_id, level_id, status)
		VALUES ($1, $2, 'in_progress')
		RETURNING id
	`, playerID, levelID).Scan(&sessionID)
	if err != nil {
		return 0, fmt.Errorf("start game session: %w", err)
	}
	return sessionID, nil
}

func (s *Store) SaveVerifiedCompletion(ctx context.Context, rec CompletionRecord) (LevelProgress, error) {
	movesJSON, err := json.Marshal(rec.MoveSequence)
	if err != nil {
		return LevelProgress{}, fmt.Errorf("marshal move sequence: %w", err)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return LevelProgress{}, fmt.Errorf("begin completion tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO players (id, display_name)
		VALUES ($1, $2)
		ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
	`, rec.PlayerID, rec.DisplayName); err != nil {
		return LevelProgress{}, fmt.Errorf("ensure player exists: %w", err)
	}

	var prog LevelProgress
	var bestMoves sql.NullInt64
	var bestPushes sql.NullInt64
	var bestTime sql.NullInt64

	err = tx.QueryRowContext(ctx, `
		INSERT INTO player_progress (
			player_id, level_id, unlocked, completed,
			best_moves, best_pushes, best_time_ms, stars, updated_at
		) VALUES ($1, $2, TRUE, TRUE, $3, $4, $5, $6, NOW())
		ON CONFLICT (player_id, level_id) DO UPDATE SET
			unlocked = TRUE,
			completed = TRUE,
			best_moves = CASE
				WHEN player_progress.best_moves IS NULL OR EXCLUDED.best_moves < player_progress.best_moves
				THEN EXCLUDED.best_moves ELSE player_progress.best_moves
			END,
			best_pushes = CASE
				WHEN player_progress.best_moves IS NULL OR EXCLUDED.best_moves < player_progress.best_moves
				THEN EXCLUDED.best_pushes ELSE player_progress.best_pushes
			END,
			best_time_ms = CASE
				WHEN player_progress.best_time_ms IS NULL OR EXCLUDED.best_time_ms < player_progress.best_time_ms
				THEN EXCLUDED.best_time_ms ELSE player_progress.best_time_ms
			END,
			stars = GREATEST(player_progress.stars, EXCLUDED.stars),
			updated_at = NOW()
		RETURNING player_id, level_id, unlocked, completed,
		          best_moves, best_pushes, best_time_ms, stars, updated_at
	`, rec.PlayerID, rec.LevelID, rec.Moves, rec.Pushes, rec.ElapsedMs, rec.Stars).Scan(
		&prog.PlayerID,
		&prog.LevelID,
		&prog.Unlocked,
		&prog.Completed,
		&bestMoves,
		&bestPushes,
		&bestTime,
		&prog.Stars,
		&prog.UpdatedAt,
	)
	if err != nil {
		return LevelProgress{}, fmt.Errorf("upsert player progress: %w", err)
	}
	if bestMoves.Valid {
		v := int(bestMoves.Int64)
		prog.BestMoves = &v
	}
	if bestPushes.Valid {
		v := int(bestPushes.Int64)
		prog.BestPushes = &v
	}
	if bestTime.Valid {
		v := bestTime.Int64
		prog.BestTimeMs = &v
	}

	if rec.LevelID < len(engine.Levels) {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO player_progress (player_id, level_id, unlocked, completed, stars, updated_at)
			VALUES ($1, $2, TRUE, FALSE, 0, NOW())
			ON CONFLICT (player_id, level_id) DO UPDATE SET unlocked = TRUE
		`, rec.PlayerID, rec.LevelID+1); err != nil {
			return LevelProgress{}, fmt.Errorf("unlock next level: %w", err)
		}
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO game_sessions (
			player_id, level_id, status, moves_count, pushes_count,
			elapsed_ms, move_sequence, completed_at
		) VALUES ($1, $2, 'completed', $3, $4, $5, $6::jsonb, NOW())
	`, rec.PlayerID, rec.LevelID, rec.Moves, rec.Pushes, rec.ElapsedMs, string(movesJSON)); err != nil {
		return LevelProgress{}, fmt.Errorf("record completed session: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO leaderboard (
			player_id, display_name, level_id, best_moves,
			best_pushes, best_time_ms, verified_moves, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
		ON CONFLICT (player_id, level_id) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			best_moves = CASE
				WHEN EXCLUDED.best_moves < leaderboard.best_moves
				  OR (EXCLUDED.best_moves = leaderboard.best_moves AND EXCLUDED.best_time_ms < leaderboard.best_time_ms)
				THEN EXCLUDED.best_moves ELSE leaderboard.best_moves
			END,
			best_pushes = CASE
				WHEN EXCLUDED.best_moves < leaderboard.best_moves
				  OR (EXCLUDED.best_moves = leaderboard.best_moves AND EXCLUDED.best_time_ms < leaderboard.best_time_ms)
				THEN EXCLUDED.best_pushes ELSE leaderboard.best_pushes
			END,
			best_time_ms = CASE
				WHEN EXCLUDED.best_moves < leaderboard.best_moves
				  OR (EXCLUDED.best_moves = leaderboard.best_moves AND EXCLUDED.best_time_ms < leaderboard.best_time_ms)
				THEN EXCLUDED.best_time_ms ELSE leaderboard.best_time_ms
			END,
			verified_moves = CASE
				WHEN EXCLUDED.best_moves < leaderboard.best_moves
				  OR (EXCLUDED.best_moves = leaderboard.best_moves AND EXCLUDED.best_time_ms < leaderboard.best_time_ms)
				THEN EXCLUDED.verified_moves ELSE leaderboard.verified_moves
			END,
			updated_at = NOW()
	`, rec.PlayerID, rec.DisplayName, rec.LevelID, rec.Moves, rec.Pushes, rec.ElapsedMs, string(movesJSON)); err != nil {
		return LevelProgress{}, fmt.Errorf("upsert leaderboard entry: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return LevelProgress{}, fmt.Errorf("commit completion tx: %w", err)
	}
	return prog, nil
}

func (s *Store) GetLeaderboard(ctx context.Context, levelID int, limit int) ([]LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT player_id, display_name, level_id, best_moves,
		       best_pushes, best_time_ms, updated_at
		FROM leaderboard
		WHERE level_id = $1
		ORDER BY best_moves ASC, best_time_ms ASC, updated_at ASC
		LIMIT $2
	`, levelID, limit)
	if err != nil {
		return nil, fmt.Errorf("query leaderboard: %w", err)
	}
	defer rows.Close()

	entries := make([]LeaderboardEntry, 0)
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(
			&e.PlayerID,
			&e.DisplayName,
			&e.LevelID,
			&e.BestMoves,
			&e.BestPushes,
			&e.BestTimeMs,
			&e.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan leaderboard entry: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate leaderboard: %w", err)
	}
	return entries, nil
}

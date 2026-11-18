-- BOXBOUND by DARR STUDIOS
-- PostgreSQL Schema Migration (001_init.sql)

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    theme TEXT NOT NULL,
    optimal_moves INTEGER NOT NULL,
    difficulty_scale DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    is_difficulty_step BOOLEAN NOT NULL DEFAULT FALSE,
    box_count INTEGER NOT NULL,
    layout_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS player_progress (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    unlocked BOOLEAN NOT NULL DEFAULT TRUE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    best_moves INTEGER,
    best_pushes INTEGER,
    best_time_ms BIGINT,
    stars INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, level_id)
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id BIGSERIAL PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'restarted')),
    moves_count INTEGER NOT NULL DEFAULT 0,
    pushes_count INTEGER NOT NULL DEFAULT 0,
    elapsed_ms BIGINT NOT NULL DEFAULT 0,
    move_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS leaderboard (
    id BIGSERIAL PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    best_moves INTEGER NOT NULL,
    best_pushes INTEGER NOT NULL,
    best_time_ms BIGINT NOT NULL,
    verified_moves JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_level_rank
    ON leaderboard (level_id, best_moves ASC, best_time_ms ASC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_level
    ON game_sessions (player_id, level_id, started_at DESC);

# BOXBOUND Go Backend (DARR STUDIOS)

Pure Go implementation of the BOXBOUND Sokoban gameplay engine, 50 chambers, solution replay verification, and optional PostgreSQL persistence.

## Architecture

- `internal/engine/`: Deterministic Sokoban grid rules (`ParseLevel`, `ApplyMove`, `UndoMove`, `IsBoardSolved`, `VerifySolutionReplay`) and all 50 levels (`levels_data.go`).
- `migrations/`: PostgreSQL DDL creating `players`, `levels`, `player_progress`, `game_sessions`, and `leaderboard` tables.
- `internal/db/`: Parameterized `database/sql` + `lib/pq` store with transactional completion verification and leaderboard upserts.
- `internal/api/`: REST endpoints for health, levels, players, progress, sessions, solution validation, completion, and leaderboard.
- `cmd/server/`: HTTP server that optionally migrates PostgreSQL and seeds all 50 levels.

## Run locally (Go 1.22+)

Without `DATABASE_URL`, the service starts in stateless mode for health, level, and solution-validation requests. Set `DATABASE_URL` to enable PostgreSQL persistence.

```bash
go test ./...
go run ./cmd/server
```

The server listens on port `8080` by default. Set `PORT` to change it. For example, with PostgreSQL running locally:

```bash
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/boxbound?sslmode=disable'
export PORT=8080
go run ./cmd/server
```

Routes are documented in the [project README](../README.md#optional-go-api).

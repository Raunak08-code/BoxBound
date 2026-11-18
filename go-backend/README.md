# BOXBOUND — Go Backend & Game Logic Engine (DARR STUDIOS)

Pure Go implementation of the BOXBOUND Sokoban gameplay engine, 50 verified chambers, solution replay verification, and PostgreSQL persistence layer.

## Architecture

- `internal/engine/`: Deterministic Sokoban grid rules (`ParseLevel`, `ApplyMove`, `UndoMove`, `IsBoardSolved`, `VerifySolutionReplay`) and all 50 levels (`levels_data.go`), including `+20%` difficulty escalation every 3 levels after Level 20 and box scaling after Level 30.
- `migrations/`: PostgreSQL DDL (`001_init.sql`) creating `players`, `levels`, `player_progress`, `game_sessions`, and `leaderboard` tables with move + completion time (`best_time_ms`) rankings.
- `internal/db/`: Parameterized `database/sql` + `lib/pq` store with transactional completion verification and leaderboard upserts.
- `internal/api/`: REST endpoints (`/api/health`, `/api/levels`, `/api/players`, `/api/progress`, `/api/sessions`, `/api/validate-solution`, `/api/progress/complete`, `/api/leaderboard`).
- `cmd/server/`: HTTP server binary that migrates PostgreSQL, seeds all 50 levels, and serves the API.

## Running Locally (Go 1.22+ & PostgreSQL)

```bash
cd go-backend
go mod tidy
go test ./...

export DATABASE_URL="postgres://postgres:postgres@localhost:5432/boxbound?sslmode=disable"
export PORT=8080
go run ./cmd/server
```

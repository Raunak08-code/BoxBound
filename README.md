# BOXBOUND

BOXBOUND is a 2D Sokoban-style puzzle game by DARR STUDIOS. Guide the keeper around each chamber and push every crate onto a target. The game includes 50 levels, keyboard and on-screen controls, undo and reset, a level timer, sound and music settings, and progress tracking.

The repository contains a React game served by an Express/Vite development server, plus an optional standalone Go API. The game currently uses its own TypeScript engine and Firebase services; the Go API is a separate implementation and is not required to run the game.

## Play locally

Requirements: Node.js 22 or newer and npm (or Bun).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server provides the game and the TypeScript-backed API routes. To make a production build and serve it:

```bash
npm run build
npm start
```

`npm run lint` runs the TypeScript compiler without emitting files. `npm run preview` starts Vite's static build preview; use `npm start` to run the Express production server.

## Play

- Move with the arrow keys or WASD, or use the on-screen directional controls.
- Push crates onto all target tiles to complete a level. Crates cannot be pulled.
- Use the in-game controls to undo a move, restart a chamber, pause, or choose a level.
- Progress, settings, guest name, and last-played level are saved in browser local storage. Signing in with Google enables Firebase-backed progress and leaderboard features, subject to the configured Firebase project and Firestore rules.

## Project layout

```text
src/
  audio/       Sound and music engine
  components/  Menus, gameplay, settings, level select, leaderboard
  engine/      TypeScript Sokoban rules, types, and 50 level definitions
  services/    Firebase auth and progress persistence
server.ts      Express server, local API routes, and Vite integration
go-backend/    Optional Go engine and REST API
```

## Firebase

The client initializes Firebase from the checked-in `firebase-applet-config.json`. Google sign-in and cloud progress require a Firebase project configured for this app, Google as an enabled authentication provider, and Firestore with the rules in `firestore.rules`. Without a working Firebase setup, local gameplay and browser-saved progress remain available; cloud sign-in and syncing will not.

The root `.env.example` documents `GEMINI_API_KEY` and `APP_URL` for AI Studio hosting. The current game code does not use either variable directly.

## Optional Go API

The standalone service under `go-backend/` provides a Go implementation of the Sokoban rules and JSON API. It can run without PostgreSQL in stateless mode; persistence, migrations, and level seeding are enabled when `DATABASE_URL` points to a PostgreSQL database.

```bash
cd go-backend
go test ./...
go run ./cmd/server
```

By default it listens on port `8080`. Set `PORT` to change that. For PostgreSQL-backed operation, set `DATABASE_URL`, for example:

```bash
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/boxbound?sslmode=disable'
export PORT=8080
go run ./cmd/server
```

Available routes:

- `GET /api/health`
- `GET /api/levels` and `GET /api/levels?id=<levelId>`
- `POST /api/players`
- `GET /api/progress?playerId=<id>`
- `POST /api/sessions`
- `POST /api/validate-solution`
- `POST /api/progress/complete`
- `GET /api/leaderboard?levelId=<id>`

The Go API allows cross-origin requests and is independent from the Express server used by the game.


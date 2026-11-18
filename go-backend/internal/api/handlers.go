package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/darrstudios/boxbound/internal/db"
	"github.com/darrstudios/boxbound/internal/engine"
)

type Server struct {
	store  *db.Store
	levels []engine.LevelDefinition
}

func NewServer(store *db.Store) *Server {
	return &Server{
		store:  store,
		levels: engine.Levels,
	}
}

func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/levels", s.handleLevels)
	mux.HandleFunc("POST /api/players", s.handleUpsertPlayer)
	mux.HandleFunc("GET /api/progress", s.handleGetProgress)
	mux.HandleFunc("POST /api/sessions", s.handleStartSession)
	mux.HandleFunc("POST /api/validate-solution", s.handleValidateSolution)
	mux.HandleFunc("POST /api/progress/complete", s.handleCompleteLevel)
	mux.HandleFunc("GET /api/leaderboard", s.handleGetLeaderboard)
}

func WithCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":      "ok",
		"studio":      "DARR STUDIOS",
		"game":        "BOXBOUND",
		"engine":      "go",
		"totalLevels": len(s.levels),
		"dbConnected": s.store != nil,
	})
}

func (s *Server) handleLevels(w http.ResponseWriter, r *http.Request) {
	if idRaw := r.URL.Query().Get("id"); idRaw != "" {
		id, err := strconv.Atoi(idRaw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid level id")
			return
		}
		lvl, ok := engine.GetLevelByID(id)
		if !ok {
			writeError(w, http.StatusNotFound, "level not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"level": lvl})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"studio": "DARR STUDIOS",
		"count":  len(s.levels),
		"levels": s.levels,
	})
}

func (s *Server) handleUpsertPlayer(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, http.StatusServiceUnavailable, "postgres database is not configured")
		return
	}
	var req struct {
		ID          string `json:"id"`
		DisplayName string `json:"displayName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}
	req.ID = strings.TrimSpace(req.ID)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.ID == "" || req.DisplayName == "" {
		writeError(w, http.StatusBadRequest, "id and displayName are required")
		return
	}

	player, err := s.store.UpsertPlayer(r.Context(), req.ID, req.DisplayName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"player": player})
}

func (s *Server) handleGetProgress(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, http.StatusServiceUnavailable, "postgres database is not configured")
		return
	}
	playerID := strings.TrimSpace(r.URL.Query().Get("playerId"))
	if playerID == "" {
		writeError(w, http.StatusBadRequest, "playerId query parameter is required")
		return
	}

	progress, err := s.store.GetProgress(r.Context(), playerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"progress": progress})
}

func (s *Server) handleStartSession(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, http.StatusServiceUnavailable, "postgres database is not configured")
		return
	}
	var req struct {
		PlayerID string `json:"playerId"`
		LevelID  int    `json:"levelId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}
	if strings.TrimSpace(req.PlayerID) == "" || req.LevelID <= 0 {
		writeError(w, http.StatusBadRequest, "playerId and valid levelId are required")
		return
	}

	sessionID, err := s.store.StartSession(r.Context(), strings.TrimSpace(req.PlayerID), req.LevelID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"sessionId": sessionID})
}

func (s *Server) handleValidateSolution(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LevelID int                `json:"levelId"`
		Moves   []engine.Direction `json:"moves"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}
	lvl, ok := engine.GetLevelByID(req.LevelID)
	if !ok {
		writeError(w, http.StatusNotFound, "level not found")
		return
	}

	result := engine.VerifySolutionReplay(lvl, req.Moves)
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleCompleteLevel(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PlayerID    string             `json:"playerId"`
		DisplayName string             `json:"displayName"`
		LevelID     int                `json:"levelId"`
		ElapsedMs   int64              `json:"elapsedMs"`
		Moves       []engine.Direction `json:"moves"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}
	lvl, ok := engine.GetLevelByID(req.LevelID)
	if !ok {
		writeError(w, http.StatusNotFound, "level not found")
		return
	}

	replay := engine.VerifySolutionReplay(lvl, req.Moves)
	if !replay.Valid {
		writeJSON(w, http.StatusUnprocessableEntity, replay)
		return
	}

	stars := 1
	if replay.Moves <= lvl.OptimalMoves {
		stars = 3
	} else if replay.Moves <= int(float64(lvl.OptimalMoves)*1.35)+2 {
		stars = 2
	}

	if s.store == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"verified":  true,
			"moves":     replay.Moves,
			"pushes":    replay.Pushes,
			"elapsedMs": req.ElapsedMs,
			"stars":     stars,
			"persisted": false,
		})
		return
	}

	playerID := strings.TrimSpace(req.PlayerID)
	displayName := strings.TrimSpace(req.DisplayName)
	if playerID == "" {
		playerID = "guest-keeper"
	}
	if displayName == "" {
		displayName = "Keeper"
	}
	if req.ElapsedMs < 0 {
		req.ElapsedMs = 0
	}

	saved, err := s.store.SaveVerifiedCompletion(r.Context(), db.CompletionRecord{
		PlayerID:     playerID,
		DisplayName:  displayName,
		LevelID:      req.LevelID,
		Moves:        replay.Moves,
		Pushes:       replay.Pushes,
		ElapsedMs:    req.ElapsedMs,
		Stars:        stars,
		MoveSequence: req.Moves,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"verified":  true,
		"persisted": true,
		"progress":  saved,
		"replay":    replay,
	})
}

func (s *Server) handleGetLeaderboard(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, http.StatusServiceUnavailable, "postgres database is not configured")
		return
	}
	levelID, err := strconv.Atoi(r.URL.Query().Get("levelId"))
	if err != nil || levelID <= 0 {
		writeError(w, http.StatusBadRequest, "valid levelId query parameter is required")
		return
	}
	limit := 25
	if limitRaw := r.URL.Query().Get("limit"); limitRaw != "" {
		if parsed, err := strconv.Atoi(limitRaw); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	entries, err := s.store.GetLeaderboard(r.Context(), levelID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"levelId": levelID,
		"entries": entries,
	})
}

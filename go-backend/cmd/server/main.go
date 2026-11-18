package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/darrstudios/boxbound/internal/api"
	"github.com/darrstudios/boxbound/internal/db"
	"github.com/darrstudios/boxbound/internal/engine"
	"github.com/darrstudios/boxbound/migrations"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()
	var store *db.Store

	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		opened, err := db.Open(ctx, dsn)
		if err != nil {
			log.Printf("warning: PostgreSQL unavailable (%v); continuing in stateless validation mode", err)
		} else {
			if err := opened.Migrate(ctx, migrations.InitSQL); err != nil {
				log.Fatalf("failed to run PostgreSQL migrations: %v", err)
			}
			if err := opened.SeedLevels(ctx, engine.Levels); err != nil {
				log.Fatalf("failed to seed 50 levels: %v", err)
			}
			store = opened
			log.Printf("PostgreSQL connected, migrated, and seeded with %d levels", len(engine.Levels))
		}
	} else {
		log.Printf("DATABASE_URL not set; running Go Sokoban engine in stateless validation mode")
	}
	defer func() {
		if store != nil {
			_ = store.Close()
		}
	}()

	srv := api.NewServer(store)
	mux := http.NewServeMux()
	srv.RegisterRoutes(mux)

	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           api.WithCORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("BOXBOUND Go Backend by DARR STUDIOS listening on :%s", port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
}

package migrations

import _ "embed"

// InitSQL holds the initial PostgreSQL schema DDL.
//
//go:embed 001_init.sql
var InitSQL string

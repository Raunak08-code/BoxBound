package engine

import "testing"

func TestAll50LevelsIntegrity(t *testing.T) {
	if len(Levels) != 50 {
		t.Fatalf("expected 50 levels, got %d", len(Levels))
	}

	for i, lvl := range Levels {
		if lvl.ID != i+1 {
			t.Fatalf("level index %d has unexpected ID %d", i, lvl.ID)
		}
		state := ParseLevel(lvl)
		if len(state.Boxes) == 0 || len(state.Boxes) != len(state.Targets) {
			t.Fatalf("level %d has mismatched boxes (%d) and targets (%d)", lvl.ID, len(state.Boxes), len(state.Targets))
		}
		if lvl.ID > 30 {
			expected := 5 + (lvl.ID-31)/5
			if len(state.Boxes) != expected {
				t.Fatalf("level %d expected %d boxes, got %d", lvl.ID, expected, len(state.Boxes))
			}
		}
	}
}

func TestMoveUndoAndWallCollision(t *testing.T) {
	lvl, ok := GetLevelByID(1)
	if !ok {
		t.Fatal("level 1 missing")
	}
	state := ParseLevel(lvl)
	start := state.Player

	// Attempt to bump wall left or up repeatedly; invalid moves must not increment count
	bumped := ApplyMove(state, DirUp)
	bumped = ApplyMove(bumped, DirUp)
	if bumped.Moves > 1 {
		t.Fatalf("wall bump unexpectedly incremented moves: %d", bumped.Moves)
	}

	moved := ApplyMove(state, DirRight)
	if moved.Moves != 1 || moved.Player.X != start.X+1 {
		t.Fatalf("expected valid move right to increment moves")
	}

	undone := UndoMove(moved)
	if undone.Moves != 0 || undone.Player != start {
		t.Fatalf("undo failed to restore player position and move count")
	}
}

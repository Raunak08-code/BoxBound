package engine

import "fmt"

var dirDelta = map[Direction]Coord{
	DirUp:    {X: 0, Y: -1},
	DirDown:  {X: 0, Y: 1},
	DirLeft:  {X: -1, Y: 0},
	DirRight: {X: 1, Y: 0},
}

func cloneCoords(src []Coord) []Coord {
	out := make([]Coord, len(src))
	copy(out, src)
	return out
}

func ParseLevel(level LevelDefinition) BoardState {
	height := len(level.Layout)
	width := 0
	for _, row := range level.Layout {
		if len(row) > width {
			width = len(row)
		}
	}

	tiles := make([][]TileType, height)
	boxes := make([]Coord, 0)
	targets := make([]Coord, 0)
	player := Coord{X: 1, Y: 1}

	for y := 0; y < height; y++ {
		rowStr := level.Layout[y]
		row := make([]TileType, width)
		for x := 0; x < width; x++ {
			ch := byte(' ')
			if x < len(rowStr) {
				ch = rowStr[x]
			}
			switch ch {
			case '#':
				row[x] = TileWall
			case '.':
				row[x] = TileTarget
				targets = append(targets, Coord{X: x, Y: y})
			case '$':
				row[x] = TileFloor
				boxes = append(boxes, Coord{X: x, Y: y})
			case '*':
				row[x] = TileTarget
				targets = append(targets, Coord{X: x, Y: y})
				boxes = append(boxes, Coord{X: x, Y: y})
			case '@':
				row[x] = TileFloor
				player = Coord{X: x, Y: y}
			case '+':
				row[x] = TileTarget
				targets = append(targets, Coord{X: x, Y: y})
				player = Coord{X: x, Y: y}
			default:
				row[x] = TileFloor
			}
		}
		tiles[y] = row
	}

	markExteriorVoid(tiles, width, height)

	return BoardState{
		LevelID:      level.ID,
		Width:        width,
		Height:       height,
		Tiles:        tiles,
		Player:       player,
		Boxes:        boxes,
		Targets:      targets,
		Facing:       DirDown,
		Moves:        0,
		Pushes:       0,
		MoveSequence: []Direction{},
		History:      []HistoryEntry{},
		Completed:    IsBoardSolved(boxes, targets),
	}
}

func markExteriorVoid(tiles [][]TileType, width, height int) {
	if height == 0 || width == 0 {
		return
	}
	visited := make([][]bool, height)
	for y := 0; y < height; y++ {
		visited[y] = make([]bool, width)
	}
	queue := make([]Coord, 0)

	for x := 0; x < width; x++ {
		if tiles[0][x] == TileFloor {
			queue = append(queue, Coord{X: x, Y: 0})
		}
		if tiles[height-1][x] == TileFloor {
			queue = append(queue, Coord{X: x, Y: height - 1})
		}
	}
	for y := 0; y < height; y++ {
		if tiles[y][0] == TileFloor {
			queue = append(queue, Coord{X: 0, Y: y})
		}
		if tiles[y][width-1] == TileFloor {
			queue = append(queue, Coord{X: width - 1, Y: y})
		}
	}

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		if cur.X < 0 || cur.X >= width || cur.Y < 0 || cur.Y >= height {
			continue
		}
		if visited[cur.Y][cur.X] || tiles[cur.Y][cur.X] != TileFloor {
			continue
		}
		visited[cur.Y][cur.X] = true
		tiles[cur.Y][cur.X] = TileVoid
		queue = append(queue,
			Coord{X: cur.X + 1, Y: cur.Y},
			Coord{X: cur.X - 1, Y: cur.Y},
			Coord{X: cur.X, Y: cur.Y + 1},
			Coord{X: cur.X, Y: cur.Y - 1},
		)
	}
}

func isWallOrVoid(tiles [][]TileType, c Coord) bool {
	if c.Y < 0 || c.Y >= len(tiles) {
		return true
	}
	if c.X < 0 || c.X >= len(tiles[c.Y]) {
		return true
	}
	t := tiles[c.Y][c.X]
	return t == TileWall || t == TileVoid
}

func findBoxIndex(boxes []Coord, c Coord) int {
	for i, b := range boxes {
		if b.X == c.X && b.Y == c.Y {
			return i
		}
	}
	return -1
}

func IsBoardSolved(boxes, targets []Coord) bool {
	if len(targets) == 0 || len(boxes) != len(targets) {
		return false
	}
	for _, t := range targets {
		found := false
		for _, b := range boxes {
			if b.X == t.X && b.Y == t.Y {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func ApplyMove(state BoardState, dir Direction) BoardState {
	if state.Completed {
		return state
	}
	delta, ok := dirDelta[dir]
	if !ok {
		return state
	}

	nextPlayer := Coord{X: state.Player.X + delta.X, Y: state.Player.Y + delta.Y}
	if isWallOrVoid(state.Tiles, nextPlayer) {
		state.Facing = dir
		return state
	}

	boxIdx := findBoxIndex(state.Boxes, nextPlayer)
	if boxIdx != -1 {
		nextBox := Coord{X: nextPlayer.X + delta.X, Y: nextPlayer.Y + delta.Y}
		if isWallOrVoid(state.Tiles, nextBox) || findBoxIndex(state.Boxes, nextBox) != -1 {
			state.Facing = dir
			return state
		}

		historyEntry := HistoryEntry{
			Player:         state.Player,
			Boxes:          cloneCoords(state.Boxes),
			Facing:         state.Facing,
			Moves:          state.Moves,
			Pushes:         state.Pushes,
			Direction:      dir,
			PushedBoxIndex: boxIdx,
		}

		updatedBoxes := cloneCoords(state.Boxes)
		updatedBoxes[boxIdx] = nextBox

		state.Player = nextPlayer
		state.Boxes = updatedBoxes
		state.Facing = dir
		state.Moves++
		state.Pushes++
		state.MoveSequence = append(append([]Direction{}, state.MoveSequence...), dir)
		state.History = append(append([]HistoryEntry{}, state.History...), historyEntry)
		state.Completed = IsBoardSolved(updatedBoxes, state.Targets)
		return state
	}

	historyEntry := HistoryEntry{
		Player:         state.Player,
		Boxes:          cloneCoords(state.Boxes),
		Facing:         state.Facing,
		Moves:          state.Moves,
		Pushes:         state.Pushes,
		Direction:      dir,
		PushedBoxIndex: -1,
	}

	state.Player = nextPlayer
	state.Facing = dir
	state.Moves++
	state.MoveSequence = append(append([]Direction{}, state.MoveSequence...), dir)
	state.History = append(append([]HistoryEntry{}, state.History...), historyEntry)
	return state
}

func UndoMove(state BoardState) BoardState {
	if len(state.History) == 0 {
		return state
	}
	prev := state.History[len(state.History)-1]
	state.Player = prev.Player
	state.Boxes = cloneCoords(prev.Boxes)
	state.Facing = prev.Facing
	state.Moves = prev.Moves
	state.Pushes = prev.Pushes
	state.MoveSequence = state.MoveSequence[:len(state.MoveSequence)-1]
	state.History = state.History[:len(state.History)-1]
	state.Completed = false
	return state
}

func VerifySolutionReplay(level LevelDefinition, moves []Direction) ReplayResult {
	if len(moves) == 0 || len(moves) > 2000 {
		return ReplayResult{Valid: false, Reason: "invalid move sequence length"}
	}

	state := ParseLevel(level)
	for i, dir := range moves {
		if _, ok := dirDelta[dir]; !ok {
			return ReplayResult{Valid: false, Reason: "illegal direction token"}
		}
		prevMoves := state.Moves
		state = ApplyMove(state, dir)
		if state.Moves == prevMoves {
			return ReplayResult{Valid: false, Reason: fmt.Sprintf("blocked move at index %d", i)}
		}
		if state.Completed && i < len(moves)-1 {
			return ReplayResult{Valid: false, Reason: "extra moves after level completion"}
		}
	}

	if !state.Completed {
		return ReplayResult{Valid: false, Moves: state.Moves, Pushes: state.Pushes, Reason: "level not solved"}
	}

	return ReplayResult{Valid: true, Moves: state.Moves, Pushes: state.Pushes}
}

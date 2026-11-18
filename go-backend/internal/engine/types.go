package engine

type Direction string

const (
	DirUp    Direction = "U"
	DirDown  Direction = "D"
	DirLeft  Direction = "L"
	DirRight Direction = "R"
)

type TileType string

const (
	TileVoid   TileType = "void"
	TileWall   TileType = "wall"
	TileFloor  TileType = "floor"
	TileTarget TileType = "target"
)

type Coord struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type LevelDefinition struct {
	ID               int      `json:"id"`
	Name             string   `json:"name"`
	Difficulty       string   `json:"difficulty"`
	Theme            string   `json:"theme"`
	Hint             string   `json:"hint"`
	OptimalMoves     int      `json:"optimalMoves"`
	DifficultyScale  float64  `json:"difficultyScale"`
	IsDifficultyStep bool     `json:"isDifficultyStep"`
	Layout           []string `json:"layout"`
}

type HistoryEntry struct {
	Player         Coord     `json:"player"`
	Boxes          []Coord   `json:"boxes"`
	Facing         Direction `json:"facing"`
	Moves          int       `json:"moves"`
	Pushes         int       `json:"pushes"`
	Direction      Direction `json:"direction"`
	PushedBoxIndex int       `json:"pushedBoxIndex"`
}

type BoardState struct {
	LevelID      int            `json:"levelId"`
	Width        int            `json:"width"`
	Height       int            `json:"height"`
	Tiles        [][]TileType   `json:"tiles"`
	Player       Coord          `json:"player"`
	Boxes        []Coord        `json:"boxes"`
	Targets      []Coord        `json:"targets"`
	Facing       Direction      `json:"facing"`
	Moves        int            `json:"moves"`
	Pushes       int            `json:"pushes"`
	MoveSequence []Direction    `json:"moveSequence"`
	History      []HistoryEntry `json:"history"`
	Completed    bool           `json:"completed"`
}

type ReplayResult struct {
	Valid  bool   `json:"valid"`
	Moves  int    `json:"moves"`
	Pushes int    `json:"pushes"`
	Reason string `json:"reason,omitempty"`
}

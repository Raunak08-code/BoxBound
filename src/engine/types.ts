export type Direction = 'U' | 'D' | 'L' | 'R';

export type TileType = 'void' | 'wall' | 'floor' | 'target';

export type LevelThemeId =
  | 'courtyard'
  | 'timber'
  | 'conservatory'
  | 'quarry'
  | 'vault';

export interface GridCoord {
  x: number;
  y: number;
}

export interface LevelDefinition {
  id: number;
  name: string;
  difficulty: 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Master' | 'Apex';
  theme: LevelThemeId;
  hint: string;
  optimalMoves: number;
  difficultyScale?: number;
  isDifficultyStep?: boolean;
  layout: string[];
}

export interface MoveHistoryEntry {
  player: GridCoord;
  boxes: GridCoord[];
  facing: Direction;
  moves: number;
  pushes: number;
  direction: Direction;
  pushedBoxIndex: number | null;
}

export interface GameBoardState {
  levelId: number;
  width: number;
  height: number;
  tiles: TileType[][];
  player: GridCoord;
  boxes: GridCoord[];
  targets: GridCoord[];
  facing: Direction;
  moves: number;
  pushes: number;
  moveSequence: Direction[];
  history: MoveHistoryEntry[];
  completed: boolean;
  lastAction: {
    type: 'idle' | 'move' | 'push' | 'bump' | 'undo' | 'reset';
    direction: Direction;
    pushedBoxIndex: number | null;
    reachedTarget: boolean;
    timestamp: number;
  };
}

export interface LevelProgressRecord {
  levelId: number;
  completed: boolean;
  bestMoves: number | null;
  bestTimeMs: number | null;
  completedAt: string | null;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  dpadLayout: 'split' | 'compact';
  showHints: boolean;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  username: string;
  levelId: number;
  bestMoves: number;
  bestTimeMs: number | null;
  updatedAt: string;
}

export type GameScreen =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'HOW_TO_PLAY'
  | 'SETTINGS'
  | 'LEADERBOARD';

import type {
  Direction,
  GameBoardState,
  GridCoord,
  LevelDefinition,
  TileType,
} from './types.ts';

const DIR_DELTA: Record<Direction, GridCoord> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
};

export function coordsEqual(a: GridCoord, b: GridCoord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function cloneBoxes(boxes: GridCoord[]): GridCoord[] {
  return boxes.map((b) => ({ x: b.x, y: b.y }));
}

export function parseLevelState(level: LevelDefinition): GameBoardState {
  const height = level.layout.length;
  const width = Math.max(...level.layout.map((row) => row.length));

  const tiles: TileType[][] = [];
  const boxes: GridCoord[] = [];
  const targets: GridCoord[] = [];
  let player: GridCoord = { x: 1, y: 1 };

  for (let y = 0; y < height; y++) {
    const rowStr = level.layout[y] ?? '';
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      const ch = rowStr[x] ?? ' ';
      switch (ch) {
        case '#':
          row.push('wall');
          break;
        case '.':
          row.push('target');
          targets.push({ x, y });
          break;
        case '$':
          row.push('floor');
          boxes.push({ x, y });
          break;
        case '*':
          row.push('target');
          targets.push({ x, y });
          boxes.push({ x, y });
          break;
        case '@':
          row.push('floor');
          player = { x, y };
          break;
        case '+':
          row.push('target');
          targets.push({ x, y });
          player = { x, y };
          break;
        case '~':
          row.push('void');
          break;
        default:
          row.push('floor');
          break;
      }
    }
    tiles.push(row);
  }

  // Mark exterior space outside walls as 'void' using flood-fill from borders
  markExteriorVoid(tiles, width, height);

  return {
    levelId: level.id,
    width,
    height,
    tiles,
    player,
    boxes,
    targets,
    facing: 'D',
    moves: 0,
    pushes: 0,
    moveSequence: [],
    history: [],
    completed: isBoardSolved(boxes, targets),
    lastAction: {
      type: 'idle',
      direction: 'D',
      pushedBoxIndex: null,
      reachedTarget: false,
      timestamp: 0,
    },
  };
}

function markExteriorVoid(tiles: TileType[][], width: number, height: number): void {
  const visited = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  const queue: GridCoord[] = [];

  for (let x = 0; x < width; x++) {
    if (tiles[0][x] === 'floor') queue.push({ x, y: 0 });
    if (tiles[height - 1][x] === 'floor') queue.push({ x, y: height - 1 });
  }
  for (let y = 0; y < height; y++) {
    if (tiles[y][0] === 'floor') queue.push({ x: 0, y });
    if (tiles[y][width - 1] === 'floor') queue.push({ x: width - 1, y });
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.x < 0 || curr.x >= width || curr.y < 0 || curr.y >= height) continue;
    if (visited[curr.y][curr.x]) continue;
    if (tiles[curr.y][curr.x] !== 'floor') continue;

    visited[curr.y][curr.x] = true;
    tiles[curr.y][curr.x] = 'void';

    queue.push({ x: curr.x + 1, y: curr.y });
    queue.push({ x: curr.x - 1, y: curr.y });
    queue.push({ x: curr.x, y: curr.y + 1 });
    queue.push({ x: curr.x, y: curr.y - 1 });
  }
}

export function isTargetTile(tiles: TileType[][], coord: GridCoord): boolean {
  const row = tiles[coord.y];
  if (!row) return false;
  return row[coord.x] === 'target';
}

export function isWallOrVoid(tiles: TileType[][], coord: GridCoord): boolean {
  const row = tiles[coord.y];
  if (!row) return true;
  const tile = row[coord.x];
  return tile === undefined || tile === 'wall' || tile === 'void';
}

export function findBoxIndex(boxes: GridCoord[], coord: GridCoord): number {
  return boxes.findIndex((b) => b.x === coord.x && b.y === coord.y);
}

export function isBoardSolved(boxes: GridCoord[], targets: GridCoord[]): boolean {
  if (targets.length === 0 || boxes.length !== targets.length) return false;
  return targets.every((target) => boxes.some((box) => coordsEqual(box, target)));
}

export function applyMove(state: GameBoardState, direction: Direction): GameBoardState {
  if (state.completed) return state;

  const delta = DIR_DELTA[direction];
  const nextPlayer: GridCoord = {
    x: state.player.x + delta.x,
    y: state.player.y + delta.y,
  };

  if (isWallOrVoid(state.tiles, nextPlayer)) {
    return {
      ...state,
      facing: direction,
      lastAction: {
        type: 'bump',
        direction,
        pushedBoxIndex: null,
        reachedTarget: false,
        timestamp: Date.now(),
      },
    };
  }

  const boxIndex = findBoxIndex(state.boxes, nextPlayer);
  if (boxIndex !== -1) {
    const nextBoxPos: GridCoord = {
      x: nextPlayer.x + delta.x,
      y: nextPlayer.y + delta.y,
    };

    if (
      isWallOrVoid(state.tiles, nextBoxPos) ||
      findBoxIndex(state.boxes, nextBoxPos) !== -1
    ) {
      return {
        ...state,
        facing: direction,
        lastAction: {
          type: 'bump',
          direction,
          pushedBoxIndex: null,
          reachedTarget: false,
          timestamp: Date.now(),
        },
      };
    }

    const updatedBoxes = cloneBoxes(state.boxes);
    updatedBoxes[boxIndex] = nextBoxPos;
    const completed = isBoardSolved(updatedBoxes, state.targets);
    const reachedTarget = isTargetTile(state.tiles, nextBoxPos);

    return {
      ...state,
      player: nextPlayer,
      boxes: updatedBoxes,
      facing: direction,
      moves: state.moves + 1,
      pushes: state.pushes + 1,
      moveSequence: [...state.moveSequence, direction],
      history: [
        ...state.history,
        {
          player: { ...state.player },
          boxes: cloneBoxes(state.boxes),
          facing: state.facing,
          moves: state.moves,
          pushes: state.pushes,
          direction,
          pushedBoxIndex: boxIndex,
        },
      ],
      completed,
      lastAction: {
        type: 'push',
        direction,
        pushedBoxIndex: boxIndex,
        reachedTarget,
        timestamp: Date.now(),
      },
    };
  }

  return {
    ...state,
    player: nextPlayer,
    facing: direction,
    moves: state.moves + 1,
    moveSequence: [...state.moveSequence, direction],
    history: [
      ...state.history,
      {
        player: { ...state.player },
        boxes: cloneBoxes(state.boxes),
        facing: state.facing,
        moves: state.moves,
        pushes: state.pushes,
        direction,
        pushedBoxIndex: null,
      },
    ],
    lastAction: {
      type: 'move',
      direction,
      pushedBoxIndex: null,
      reachedTarget: false,
      timestamp: Date.now(),
    },
  };
}

export function undoLastMove(state: GameBoardState): GameBoardState {
  if (state.history.length === 0) return state;

  const previous = state.history[state.history.length - 1];
  return {
    ...state,
    player: { ...previous.player },
    boxes: cloneBoxes(previous.boxes),
    facing: previous.facing,
    moves: previous.moves,
    pushes: previous.pushes,
    moveSequence: state.moveSequence.slice(0, -1),
    history: state.history.slice(0, -1),
    completed: false,
    lastAction: {
      type: 'undo',
      direction: previous.direction,
      pushedBoxIndex: previous.pushedBoxIndex,
      reachedTarget: false,
      timestamp: Date.now(),
    },
  };
}

export function resetBoardState(level: LevelDefinition): GameBoardState {
  const fresh = parseLevelState(level);
  return {
    ...fresh,
    lastAction: {
      type: 'reset',
      direction: 'D',
      pushedBoxIndex: null,
      reachedTarget: false,
      timestamp: Date.now(),
    },
  };
}

/**
 * Deterministic solution replay used for both server-side and client-side score verification.
 * Ensures submitted move counts exactly match valid grid moves that actually solve the level.
 */
export function verifySolutionReplay(
  level: LevelDefinition,
  directions: Direction[],
): { valid: boolean; moves: number; pushes: number; reason?: string } {
  if (!Array.isArray(directions) || directions.length === 0 || directions.length > 2000) {
    return { valid: false, moves: 0, pushes: 0, reason: 'Invalid move sequence length.' };
  }

  let state = parseLevelState(level);
  for (let i = 0; i < directions.length; i++) {
    const dir = directions[i];
    if (dir !== 'U' && dir !== 'D' && dir !== 'L' && dir !== 'R') {
      return { valid: false, moves: 0, pushes: 0, reason: 'Illegal direction token.' };
    }
    const prevMoves = state.moves;
    state = applyMove(state, dir);
    if (state.moves === prevMoves) {
      return { valid: false, moves: 0, pushes: 0, reason: `Blocked move at index ${i}.` };
    }
    if (state.completed && i < directions.length - 1) {
      return { valid: false, moves: 0, pushes: 0, reason: 'Extra moves after completion.' };
    }
  }

  if (!state.completed) {
    return { valid: false, moves: state.moves, pushes: state.pushes, reason: 'Level not solved.' };
  }

  return { valid: true, moves: state.moves, pushes: state.pushes };
}

/**
 * Detects simple corner deadlocks (a box not on a target that is wedged against
 * two perpendicular walls) so the UI can warn players gently without altering rules.
 */
export function isBoxCornerDeadlocked(
  tiles: TileType[][],
  box: GridCoord,
): boolean {
  if (isTargetTile(tiles, box)) return false;
  const up = isWallOrVoid(tiles, { x: box.x, y: box.y - 1 });
  const down = isWallOrVoid(tiles, { x: box.x, y: box.y + 1 });
  const left = isWallOrVoid(tiles, { x: box.x - 1, y: box.y });
  const right = isWallOrVoid(tiles, { x: box.x + 1, y: box.y });
  return (up && left) || (up && right) || (down && left) || (down && right);
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatPreciseTime, formatTimerClock } from '../engine/formatTime.ts';
import { LEVEL_THEMES, LEVELS } from '../engine/levels.ts';
import { isBoxCornerDeadlocked, isTargetTile } from '../engine/sokoban.ts';
import type {
  Direction,
  GameBoardState,
  LevelDefinition,
  PlayerSettings,
} from '../engine/types.ts';
import { SaveCompletionResult } from '../services/progressService.ts';
import { StudioCredit } from './BrandLockup.tsx';
import { DirectionalControls } from './DirectionalControls.tsx';
import { GameCanvas } from './GameCanvas.tsx';

interface GameplayScreenProps {
  level: LevelDefinition;
  board: GameBoardState;
  elapsedMs: number;
  bestMoves: number | null;
  bestTimeMs: number | null;
  settings: PlayerSettings;
  isPaused: boolean;
  completionResult: SaveCompletionResult | null;
  savingCompletion: boolean;
  onMove: (direction: Direction) => void;
  onUndo: () => void;
  onRestart: () => void;
  onTogglePause: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onNextLevel: () => void;
  onExitToMenu: () => void;
  onExitToLevels: () => void;
  onOpenLeaderboard: (levelId: number) => void;
}

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'U',
  w: 'U',
  W: 'U',
  ArrowDown: 'D',
  s: 'D',
  S: 'D',
  ArrowLeft: 'L',
  a: 'L',
  A: 'L',
  ArrowRight: 'R',
  d: 'R',
  D: 'R',
};

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  level,
  board,
  elapsedMs,
  bestMoves,
  bestTimeMs,
  settings,
  isPaused,
  completionResult,
  savingCompletion,
  onMove,
  onUndo,
  onRestart,
  onTogglePause,
  onToggleSound,
  onToggleMusic,
  onNextLevel,
  onExitToMenu,
  onExitToLevels,
  onOpenLeaderboard,
}) => {
  const [hintExpanded, setHintExpanded] = useState(false);

  const theme = LEVEL_THEMES[level.theme];
  const coveredTargets = useMemo(() => {
    return board.boxes.filter((b) => isTargetTile(board.tiles, b)).length;
  }, [board.boxes, board.tiles]);

  const hasCornerDeadlock = useMemo(() => {
    if (board.completed) return false;
    return board.boxes.some((b) => isBoxCornerDeadlocked(board.tiles, b));
  }, [board.boxes, board.tiles, board.completed]);

  useEffect(() => {
    setHintExpanded(false);
  }, [level.id]);

  const heldKeyRef = useRef<string | null>(null);
  const repeatTimeoutRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const stopKeyRepeat = useCallback(() => {
    heldKeyRef.current = null;
    if (repeatTimeoutRef.current !== null) {
      window.clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPaused || board.completed) {
      stopKeyRepeat();
    }
  }, [isPaused, board.completed, stopKeyRepeat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (!board.completed) {
          e.preventDefault();
          onTogglePause();
        }
        return;
      }

      if (isPaused || board.completed) {
        if (board.completed && e.key === 'Enter' && level.id < LEVELS.length) {
          e.preventDefault();
          onNextLevel();
        }
        return;
      }

      if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
        e.preventDefault();
        onUndo();
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRestart();
        return;
      }

      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();

      if (e.repeat) return;
      if (heldKeyRef.current === e.key) return;

      stopKeyRepeat();
      heldKeyRef.current = e.key;
      onMoveRef.current(dir);

      repeatTimeoutRef.current = window.setTimeout(() => {
        repeatIntervalRef.current = window.setInterval(() => {
          onMoveRef.current(dir);
        }, 145);
      }, 185);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (heldKeyRef.current === e.key) {
        stopKeyRepeat();
      }
    };

    const handleBlur = () => {
      stopKeyRepeat();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      stopKeyRepeat();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    board.completed,
    isPaused,
    level.id,
    onNextLevel,
    onRestart,
    onTogglePause,
    onUndo,
    stopKeyRepeat,
  ]);

  const hasNextLevel = level.id < LEVELS.length;

  return (
    <div
      className={`relative w-full h-full bg-gradient-to-br ${theme.backdropGradient} flex flex-col overflow-hidden`}
    >
      {/* Top Unobtrusive HUD Bar */}
      <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-slate-950/65 border-b border-slate-800/80 shrink-0">
        {/* Zone 1: Level identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono-num text-xs sm:text-sm font-bold text-amber-400 whitespace-nowrap">
            LVL {String(level.id).padStart(2, '0')}/{LEVELS.length}
          </span>
          <span className="font-display font-bold text-sm sm:text-base text-white truncate">
            {level.name}
          </span>
          <span className="hidden lg:inline text-xs text-slate-400 whitespace-nowrap">
            · {theme.label}
            {level.difficultyScale && level.difficultyScale > 1 ? ` · ${level.difficultyScale}x` : ''}
          </span>
        </div>

        {/* Zone 2: Tabular metrics including real-time Timer */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm shrink-0">
          <div className="flex items-center gap-1.5" aria-label="Elapsed time">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-mono-num font-bold text-sky-300 text-sm sm:text-base">
              {formatTimerClock(elapsedMs)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Moves</span>
            <span className="font-mono-num font-bold text-white text-sm sm:text-base">
              {board.moves}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 hidden sm:inline">Targets</span>
            <span
              className={`font-mono-num font-bold text-sm sm:text-base ${
                coveredTargets === board.targets.length
                  ? 'text-emerald-400'
                  : 'text-amber-300'
              }`}
            >
              {coveredTargets}/{board.targets.length}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-400">Best</span>
            <span className="font-mono-num font-semibold text-slate-200">
              {bestMoves !== null ? `${bestMoves}m` : '—'}
              {bestTimeMs !== null ? ` · ${formatPreciseTime(bestTimeMs)}` : ''}
            </span>
          </div>
        </div>

        {/* Zone 3: Quick Gameplay Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {settings.showHints && (
            <button
              type="button"
              onClick={() => setHintExpanded((v) => !v)}
              title="Toggle Hint"
              aria-label="Toggle Hint"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                hintExpanded
                  ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden xl:inline">Hint</span>
            </button>
          )}

          <button
            type="button"
            onClick={onUndo}
            disabled={board.history.length === 0 || isPaused || board.completed}
            title="Undo (Z)"
            aria-label="Undo move"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-slate-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            disabled={isPaused}
            title="Restart Level (R)"
            aria-label="Restart level"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restart</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            title={settings.soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
            aria-label={settings.soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            title="Pause (Esc)"
            aria-label="Pause game"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Pause className="w-4 h-4" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        </div>
      </header>

      {/* Main Playfield Canvas Area */}
      <main className="relative flex-1 w-full flex items-center justify-center overflow-hidden px-4 sm:px-24 pb-16 sm:pb-8 pt-2">
        <GameCanvas board={board} themeId={level.theme} />

        {hintExpanded && !board.completed && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 max-w-lg px-4 py-2 rounded-lg bg-slate-900/92 border border-amber-400/50 text-xs sm:text-sm text-amber-100 shadow-lg text-center">
            {level.hint}
          </div>
        )}

        {hasCornerDeadlock && !hintExpanded && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-orange-400/60 text-xs text-orange-200 shadow-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>A crate is wedged in a corner — press Undo (Z) or Restart (R)</span>
          </div>
        )}
      </main>

      <DirectionalControls
        layout={settings.dpadLayout}
        disabled={isPaused || board.completed}
        onMove={onMove}
      />

      {/* Pause Modal */}
      {isPaused && !board.completed && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
        >
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-5">
            <div className="text-center">
              <p className="font-mono-num text-xs font-bold text-amber-400">
                LEVEL {String(level.id).padStart(2, '0')} · {formatTimerClock(elapsedMs)}
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-1">
                Paused
              </h2>
              <p className="text-xs text-slate-400 mt-1">{level.name}</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>

              <button
                type="button"
                onClick={() => {
                  onTogglePause();
                  onRestart();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Chamber
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  SFX: {settings.soundEnabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={onToggleMusic}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  Music: {settings.musicEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onExitToLevels}
                  className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  Level Select
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  Main Menu
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              BOXBOUND by <StudioCredit />
            </div>
          </div>
        </div>
      )}

      {/* Level Completion Modal */}
      {board.completed && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/82 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Level Completed"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/50 p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="font-mono-num text-xs font-bold text-emerald-400">
                CHAMBER {String(level.id).padStart(2, '0')} CLEARED
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                {level.id === LEVELS.length ? 'All 50 Chambers Mastered!' : `${level.name} Complete`}
              </h2>
              {(completionResult?.isNewBest || completionResult?.isNewBestTime) && (
                <p className="text-xs font-semibold text-amber-300">
                  {completionResult.isNewBest && completionResult.isNewBestTime
                    ? 'New Best Moves & Fastest Time!'
                    : completionResult.isNewBest
                    ? 'New Personal Best Move Record!'
                    : 'New Fastest Completion Time!'}
                </p>
              )}
            </div>

            {/* Stats Grid: Moves, Best Moves, Time, Best Time */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 text-center">
              <div>
                <div className="text-[11px] text-slate-400">Moves</div>
                <div className="font-mono-num text-lg font-bold text-white mt-0.5">
                  {board.moves}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Best Moves</div>
                <div className="font-mono-num text-lg font-bold text-emerald-400 mt-0.5">
                  {bestMoves ?? board.moves}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Time</div>
                <div className="font-mono-num text-lg font-bold text-sky-300 mt-0.5">
                  {formatPreciseTime(completionResult?.elapsedMs ?? elapsedMs)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Best Time</div>
                <div className="font-mono-num text-lg font-bold text-amber-300 mt-0.5">
                  {formatPreciseTime(bestTimeMs ?? elapsedMs)}
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400 font-mono-num">
              Chamber Par: {level.optimalMoves} moves
            </div>

            {savingCompletion && (
              <p className="text-center text-xs text-slate-400">
                Verifying solution and saving record...
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {hasNextLevel ? (
                <button
                  type="button"
                  onClick={onNextLevel}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm sm:text-base transition-colors cursor-pointer"
                >
                  Next Level
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenLeaderboard(level.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm sm:text-base transition-colors cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  View Global Leaderboard
                </button>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLeaderboard(level.id)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Ranks
                </button>
                <button
                  type="button"
                  onClick={onExitToLevels}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  Levels
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

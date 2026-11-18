import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Play, RotateCw } from 'lucide-react';
import { formatPreciseTime } from '../engine/formatTime.ts';
import { LEVEL_THEMES, LEVELS } from '../engine/levels.ts';
import { LocalProgressStore } from '../services/progressService.ts';
import { StudioCredit } from './BrandLockup.tsx';
import { StudioFooter } from './StudioFooter.tsx';

interface LevelSelectScreenProps {
  progress: LocalProgressStore;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

const CHAPTERS = [
  { id: 0, label: 'Ch. 1 (1–10)', range: [1, 10] as const, subtitle: 'Foundations · 1–4 Crates' },
  { id: 1, label: 'Ch. 2 (11–20)', range: [11, 20] as const, subtitle: 'Warehouse Expansion · 4 Crates' },
  { id: 2, label: 'Ch. 3 (21–30)', range: [21, 30] as const, subtitle: '+20% Difficulty Steps · 4 Crates' },
  { id: 3, label: 'Ch. 4 (31–40)', range: [31, 40] as const, subtitle: 'Heavy Freight · 5–6 Crates' },
  { id: 4, label: 'Ch. 5 (41–50)', range: [41, 50] as const, subtitle: 'Apex Vaults · 7–8 Crates' },
];

function countLevelBoxes(layout: string[]): number {
  let count = 0;
  for (const row of layout) {
    for (const ch of row) {
      if (ch === '$' || ch === '*') count++;
    }
  }
  return count;
}

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
  progress,
  onSelectLevel,
  onBack,
}) => {
  const initialChapter = Math.min(
    CHAPTERS.length - 1,
    Math.floor((progress.unlockedLevel - 1) / 10),
  );
  const [chapterIndex, setChapterIndex] = useState(initialChapter);

  const activeChapter = CHAPTERS[chapterIndex];
  const visibleLevels = useMemo(() => {
    const [start, end] = activeChapter.range;
    return LEVELS.filter((l) => l.id >= start && l.id <= end);
  }, [activeChapter]);

  const completedTotal = Object.values(progress.levels).filter((l) => l.completed).length;

  return (
    <div className="w-full h-full bg-[#0F172A] text-slate-100 flex flex-col px-6 sm:px-10 py-4 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Menu
            </button>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                Select Chamber
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {activeChapter.subtitle} · Built by <StudioCredit />
              </p>
            </div>
          </div>

          <div className="text-right font-mono-num text-sm text-slate-300 shrink-0">
            <span className="text-emerald-400 font-bold">{completedTotal}</span> / {LEVELS.length} Cleared
          </div>
        </div>

        {/* 5 Chapter Tabs (10 levels per chapter = 50 total) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
          {CHAPTERS.map((ch) => {
            const [s, e] = ch.range;
            const chCleared = LEVELS.filter(
              (l) => l.id >= s && l.id <= e && progress.levels[l.id]?.completed,
            ).length;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChapterIndex(ch.id)}
                className={`flex-1 min-w-[110px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                  chapterIndex === ch.id
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{ch.label}</span>
                <span
                  className={`font-mono-num text-[11px] ${
                    chapterIndex === ch.id ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {chCleared}/10
                </span>
              </button>
            );
          })}
        </div>

        {/* 10 Levels in active chapter (5x2 landscape grid) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {visibleLevels.map((level) => {
            const record = progress.levels[level.id];
            const isUnlocked = level.id <= progress.unlockedLevel;
            const isCompleted = Boolean(record?.completed);
            const theme = LEVEL_THEMES[level.theme];
            const boxCount = countLevelBoxes(level.layout);

            return (
              <div
                key={level.id}
                className={`rounded-xl p-3.5 border flex flex-col justify-between gap-2.5 transition-colors ${
                  isUnlocked
                    ? 'bg-slate-800/85 border-slate-700 hover:border-amber-400/60'
                    : 'bg-slate-900/75 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-num text-xs font-bold text-amber-400">
                      LVL {String(level.id).padStart(2, '0')}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Completed" />
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-label="Locked" />
                    ) : null}
                  </div>

                  <h2 className="font-display text-sm sm:text-base font-bold text-white leading-snug truncate">
                    {level.name}
                  </h2>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <span>{level.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{boxCount} Crates</span>
                    {level.isDifficultyStep && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300 font-semibold">+20%</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{theme.label}</div>
                </div>

                <div className="pt-2 border-t border-slate-700/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Best</span>
                    <span className="font-mono-num font-semibold text-slate-200">
                      {record?.bestMoves != null ? `${record.bestMoves}m` : '—'}
                      <span className="text-slate-500"> · </span>
                      <span className="text-sky-300">
                        {formatPreciseTime(record?.bestTimeMs)}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => onSelectLevel(level.id)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      !isUnlocked
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isCompleted
                        ? 'bg-slate-700 hover:bg-emerald-500 hover:text-slate-950 text-white cursor-pointer'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {!isUnlocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Locked
                      </>
                    ) : isCompleted ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        Replay
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Play
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prominent Studio Attribution Footer */}
        <StudioFooter
          variant="panel"
          rightSlot={<span>50 Chambers · Progressive +20% Difficulty &amp; Crate Scaling</span>}
        />
      </div>
    </div>
  );
};

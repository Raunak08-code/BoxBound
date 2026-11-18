import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { formatPreciseTime } from '../engine/formatTime.ts';
import { getLevelById, LEVELS } from '../engine/levels.ts';
import type { LeaderboardEntry } from '../engine/types.ts';
import { fetchLeaderboard } from '../services/progressService.ts';
import { StudioCredit } from './BrandLockup.tsx';

interface LeaderboardScreenProps {
  initialLevelId?: number;
  currentUserId?: string | null;
  onPlayLevel: (levelId: number) => void;
  onBack: () => void;
}

const CHAPTER_RANGES = [
  { label: '1–10', start: 1, end: 10 },
  { label: '11–20', start: 11, end: 20 },
  { label: '21–30', start: 21, end: 30 },
  { label: '31–40', start: 31, end: 40 },
  { label: '41–50', start: 41, end: 50 },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  initialLevelId = 1,
  currentUserId,
  onPlayLevel,
  onBack,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevelId);
  const [chapterIdx, setChapterIdx] = useState<number>(() =>
    Math.min(4, Math.floor((initialLevelId - 1) / 10)),
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBoard = async (levelId: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchLeaderboard(levelId);
      setEntries(list);
    } catch {
      setErrorMsg('Leaderboard temporarily unavailable. Play offline anytime—records sync when reconnected.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard(selectedLevel);
  }, [selectedLevel]);

  const levelMeta = getLevelById(selectedLevel);
  const activeRange = CHAPTER_RANGES[chapterIdx];
  const chapterLevels = LEVELS.filter(
    (l) => l.id >= activeRange.start && l.id <= activeRange.end,
  );

  return (
    <div className="w-full h-full bg-[#0F172A] text-slate-100 flex flex-col px-6 sm:px-10 py-5 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-4 my-auto">
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
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Global Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Fewest verified moves & fastest times · Par for Level {levelMeta.id} is{' '}
                <span className="font-mono-num text-amber-300 font-semibold">
                  {levelMeta.optimalMoves} moves
                </span>{' '}
                · <StudioCredit />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadBoard(selectedLevel)}
              aria-label="Refresh leaderboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => onPlayLevel(selectedLevel)}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Play Level {selectedLevel}
            </button>
          </div>
        </div>

        {/* Chapter + Level Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
            {CHAPTER_RANGES.map((ch, idx) => (
              <button
                key={ch.label}
                type="button"
                onClick={() => {
                  setChapterIdx(idx);
                  setSelectedLevel(ch.start);
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  chapterIdx === idx
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Levels {ch.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
            {chapterLevels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setSelectedLevel(lvl.id)}
                className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono-num transition-colors cursor-pointer whitespace-nowrap ${
                  selectedLevel === lvl.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                L{lvl.id}
              </button>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-slate-800/75 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm text-white">
                Level {levelMeta.id}: {levelMeta.name}
              </span>
            </div>
            <span className="text-xs text-slate-400">{levelMeta.difficulty}</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading verified records...
            </div>
          ) : errorMsg ? (
            <div className="py-10 px-6 text-center text-sm text-amber-300">
              {errorMsg}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center gap-2">
              <p className="text-sm text-slate-300 font-medium">
                No verified records posted for Level {levelMeta.id} yet.
              </p>
              <p className="text-xs text-slate-400">
                Sign in and clear this chamber to claim the first rank!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/70 text-xs text-slate-400">
                    <th className="py-2.5 px-5 font-medium">Rank</th>
                    <th className="py-2.5 px-5 font-medium">Player</th>
                    <th className="py-2.5 px-5 font-medium text-right">Moves</th>
                    <th className="py-2.5 px-5 font-medium text-right">Time</th>
                    <th className="py-2.5 px-5 font-medium text-right">Vs Par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {entries.map((entry, idx) => {
                    const diff = entry.bestMoves - levelMeta.optimalMoves;
                    const isSelf = currentUserId && entry.playerId === currentUserId;
                    return (
                      <tr
                        key={entry.id}
                        className={isSelf ? 'bg-amber-400/10' : 'hover:bg-slate-800/60'}
                      >
                        <td className="py-2.5 px-5 font-mono-num font-bold text-amber-400">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-5 font-medium text-white">
                          {entry.username}
                          {isSelf && (
                            <span className="ml-2 text-xs text-amber-300 font-normal">
                              (You)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-5 font-mono-num font-bold text-right text-emerald-400">
                          {entry.bestMoves}
                        </td>
                        <td className="py-2.5 px-5 font-mono-num text-right text-sky-300">
                          {formatPreciseTime(entry.bestTimeMs)}
                        </td>
                        <td className="py-2.5 px-5 font-mono-num text-right text-slate-300">
                          {diff === 0 ? 'Par' : diff > 0 ? `+${diff}` : `${diff}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

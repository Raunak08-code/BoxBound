import React, { useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import {
  BookOpen,
  Grid2x2,
  LogIn,
  LogOut,
  Play,
  RotateCcw,
  Settings,
  Trophy,
} from 'lucide-react';
import { LEVELS } from '../engine/levels.ts';
import { BrandLockup, KeeperAvatar } from './BrandLockup.tsx';
import { StudioFooter } from './StudioFooter.tsx';

interface MainMenuScreenProps {
  user: User | null;
  username: string;
  unlockedLevel: number;
  completedCount: number;
  continueLevelId: number;
  authBusy: boolean;
  onPlayNew: () => void;
  onContinue: () => void;
  onOpenLevels: () => void;
  onOpenLeaderboard: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  user,
  username,
  unlockedLevel,
  completedCount,
  continueLevelId,
  authBusy,
  onPlayNew,
  onContinue,
  onOpenLevels,
  onOpenLeaderboard,
  onOpenHowToPlay,
  onOpenSettings,
  onSignIn,
  onSignOut,
}) => {
  const [backdropFailed, setBackdropFailed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'INPUT') return;
        e.preventDefault();
        if (completedCount > 0 || continueLevelId > 1) {
          onContinue();
        } else {
          onPlayNew();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [completedCount, continueLevelId, onContinue, onPlayNew]);

  const hasProgress = completedCount > 0 || unlockedLevel > 1;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0F172A] flex items-center">
      {!backdropFailed ? (
        <img
          src="/src/assets/images/boxbound_title_backdrop_1795023873586.jpg"
          alt="BOXBOUND sunlit puzzle warehouse courtyard"
          referrerPolicy="no-referrer"
          onError={() => setBackdropFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1120]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/95 via-[#0F172A]/82 to-[#0F172A]/25" />

      <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex flex-col justify-between">
        {/* Top utility row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KeeperAvatar size={42} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">
                {username}
              </span>
              <span className="text-xs text-slate-300 font-mono-num">
                {completedCount}/{LEVELS.length} Cleared · Level {unlockedLevel} Unlocked
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={onSignOut}
                disabled={authBusy}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/85 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600/80 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={authBusy}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-400/40 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                {authBusy ? 'Signing In...' : 'Sign In to Sync Scores'}
              </button>
            )}
          </div>
        </div>

        {/* Left Hero Column */}
        <div className="my-auto max-w-md flex flex-col gap-5">
          <BrandLockup />

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-sm">
            Slide wooden crates onto glowing targets across 50 progressively scaling chambers. Beat the clock and set the lowest move count.
          </p>

          <div className="flex flex-col gap-2.5 max-w-xs">
            {hasProgress ? (
              <button
                type="button"
                onClick={onContinue}
                className="w-full inline-flex items-center justify-between px-5 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-bold text-base shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Play className="w-5 h-5 fill-slate-950" />
                  Continue Game
                </span>
                <span className="text-xs font-mono-num font-bold opacity-80">
                  Level {continueLevelId}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlayNew}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-bold text-base shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                Play
              </button>
            )}

            {hasProgress && (
              <button
                type="button"
                onClick={onPlayNew}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-600/80 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                Play from Level 1
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenLevels}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Grid2x2 className="w-4 h-4 text-emerald-400" />
                50 Levels
              </button>

              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Leaderboard
              </button>

              <button
                type="button"
                onClick={onOpenHowToPlay}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                How to Play
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-slate-300" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Prominent Studio Attribution Footer */}
        <StudioFooter
          variant="menu"
          rightSlot={<span>WASD or Arrow Keys Move · Z Undo · R Restart · Enter Start</span>}
        />
      </div>
    </div>
  );
};

import React from 'react';
import {
  ArrowLeft,
  CheckSquare,
  Compass,
  Move,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { StudioCredit } from './BrandLockup.tsx';

interface HowToPlayScreenProps {
  onBack: () => void;
  onStartPlaying: () => void;
}

export const HowToPlayScreen: React.FC<HowToPlayScreenProps> = ({
  onBack,
  onStartPlaying,
}) => {
  return (
    <div className="w-full h-full bg-[#0F172A] text-slate-100 flex flex-col px-6 sm:px-10 py-5 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-6 my-auto">
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
                How to Play BOXBOUND
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Master all 50 chambers in under 30 seconds · Built by <StudioCredit />
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartPlaying}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Start Playing
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Move className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Four-Way Movement
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Move Up, Down, Left, or Right one tile at a time using Arrow Keys, WASD, or the on-screen touch arrows. Diagonal moves are not allowed.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Push, Never Pull
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Walk into a wooden crate to push it forward one tile. You can only push one crate at a time, and crates cannot pass through walls or other crates.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Lock All Targets
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Push every crate onto a glowing floor target pad. Crates turn bright emerald with a checkmark when seated. Cover all targets to clear the level.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-400/30 flex items-center justify-center text-orange-400">
              <Undo2 className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Undo & Restart
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Avoid wedging crates in wall corners without targets! Press Undo (<span className="font-mono-num text-amber-300">Z</span>) to step back or Restart (<span className="font-mono-num text-amber-300">R</span>) anytime.
            </p>
          </div>
        </div>

        {/* Visual Board Legend */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-[#C97B3A] border-2 border-[#8A4B1C] inline-block" />
            <span>Wooden Crate</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-[#10B981]/30 border-2 border-[#6EE7B7] inline-block" />
            <span>Target Pad</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-[#10B981] border-2 border-[#047857] inline-block" />
            <span>Crate Locked on Target</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-[#D99B52] border-2 border-[#5C3716] inline-block" />
            <span>Stone Wall</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <RotateCcw className="w-4 h-4" />
            <span>Blocked bumps never count as moves</span>
          </div>
        </div>
      </div>
    </div>
  );
};

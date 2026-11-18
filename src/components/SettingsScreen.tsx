import React, { useState } from 'react';
import { type User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  LogIn,
  LogOut,
  Music,
  Trash2,
  Volume2,
} from 'lucide-react';
import { PlayerSettings } from '../engine/types.ts';
import { StudioCredit } from './BrandLockup.tsx';

interface SettingsScreenProps {
  user: User | null;
  username: string;
  settings: PlayerSettings;
  authBusy: boolean;
  onUpdateSettings: (next: PlayerSettings) => void;
  onSaveUsername: (name: string) => Promise<void>;
  onResetProgress: () => Promise<void>;
  onSignIn: () => void;
  onSignOut: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  username,
  settings,
  authBusy,
  onUpdateSettings,
  onSaveUsername,
  onResetProgress,
  onSignIn,
  onSignOut,
  onBack,
}) => {
  const [nameInput, setNameInput] = useState(username);
  const [nameSaved, setNameSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveUsername(nameInput);
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 1800);
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await onResetProgress();
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#0F172A] text-slate-100 flex flex-col px-6 sm:px-10 py-5 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-5 my-auto">
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
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Audio, directional control layout, and player progression preferences · Built by <StudioCredit />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Audio & Gameplay Preferences */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="font-display text-lg font-bold text-white">
              Audio & Controls
            </h2>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Sound Effects</div>
                  <div className="text-xs text-slate-400">Footsteps, crate pushes, target chimes</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
                }
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.soundEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {settings.soundEnabled ? 'On' : 'Off'}
              </button>
            </div>

            {/* Music Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Music className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Background Music</div>
                  <div className="text-xs text-slate-400">Subtle ambient puzzle synth</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, musicEnabled: !settings.musicEnabled })
                }
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.musicEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {settings.musicEnabled ? 'On' : 'Off'}
              </button>
            </div>

            {/* Hints Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Chamber Hint Button</div>
                <div className="text-xs text-slate-400">Allow showing optional puzzle clues</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, showHints: !settings.showHints })
                }
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.showHints
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {settings.showHints ? 'Shown' : 'Hidden'}
              </button>
            </div>

            {/* Control Layout */}
            <div className="pt-2 border-t border-slate-700/70 flex flex-col gap-2">
              <div className="text-sm font-semibold text-white">
                Touch Control Layout
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, dpadLayout: 'split' })}
                  className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    settings.dpadLayout === 'split'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Split Left / Right
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, dpadLayout: 'compact' })}
                  className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    settings.dpadLayout === 'compact'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Compact D-Pad
                </button>
              </div>
            </div>
          </div>

          {/* Profile & Progress Management */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-bold text-white">
                Player Profile & Data
              </h2>

              <form onSubmit={handleSaveName} className="flex flex-col gap-2">
                <label htmlFor="player-name-input" className="text-xs font-medium text-slate-300">
                  Leaderboard Display Name (max 32 chars)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="player-name-input"
                    type="text"
                    maxLength={32}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Keeper"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {nameSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Saved
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-2 border-t border-slate-700/70 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Cloud Sync Account</div>
                  <div className="text-xs text-slate-400">
                    {user
                      ? 'Signed in — progress & leaderboard scores synced'
                      : 'Playing locally — sign in to post verified leaderboard scores'}
                  </div>
                </div>
                {user ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    disabled={authBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignIn}
                    disabled={authBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Reset Progress */}
            <div className="pt-3 border-t border-slate-700/70">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/60 text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset All Progress
                </button>
              ) : (
                <div className="bg-rose-950/70 border border-rose-600/70 rounded-lg p-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs text-rose-100 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Reset all unlocked chambers and best move records?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      {resetting ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

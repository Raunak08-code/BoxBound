/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { soundEngine } from './audio/soundEngine.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { GameplayScreen } from './components/GameplayScreen.tsx';
import { HowToPlayScreen } from './components/HowToPlayScreen.tsx';
import { LeaderboardScreen } from './components/LeaderboardScreen.tsx';
import { LevelSelectScreen } from './components/LevelSelectScreen.tsx';
import { MainMenuScreen } from './components/MainMenuScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { getLevelById, LEVELS } from './engine/levels.ts';
import {
  applyMove,
  parseLevelState,
  resetBoardState,
  undoLastMove,
} from './engine/sokoban.ts';
import type {
  Direction,
  GameBoardState,
  GameScreen,
  PlayerSettings,
} from './engine/types.ts';
import {
  auth,
  signInWithGoogle,
  signOutPlayer,
  testFirestoreConnection,
} from './services/firebase.ts';
import {
  countCompletedLevels,
  loadGuestName,
  loadLastPlayedLevel,
  loadLocalProgress,
  loadSettings,
  LocalProgressStore,
  resetAllProgress,
  saveGuestName,
  saveLastPlayedLevel,
  saveLevelCompletion,
  SaveCompletionResult,
  saveSettings,
  startCloudSession,
  syncProgressWithCloud,
  updateCloudUsername,
} from './services/progressService.ts';

function BoxboundApp() {
  const [screen, setScreen] = useState<GameScreen>('MAIN_MENU');
  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [username, setUsername] = useState<string>(() => loadGuestName());
  const [progress, setProgress] = useState<LocalProgressStore>(() => loadLocalProgress());
  const [settings, setSettings] = useState<PlayerSettings>(() => loadSettings());

  const [currentLevelId, setCurrentLevelId] = useState<number>(() => {
    const saved = loadLastPlayedLevel();
    const prog = loadLocalProgress();
    return Math.min(saved, prog.unlockedLevel);
  });

  const [board, setBoard] = useState<GameBoardState>(() =>
    parseLevelState(getLevelById(Math.min(loadLastPlayedLevel(), loadLocalProgress().unlockedLevel))),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboardLevelId, setLeaderboardLevelId] = useState(1);
  const [completionResult, setCompletionResult] = useState<SaveCompletionResult | null>(null);
  const [savingCompletion, setSavingCompletion] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const completionHandledRef = useRef<boolean>(false);
  const accumulatedMsRef = useRef<number>(0);
  const segmentStartRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    accumulatedMsRef.current = 0;
    segmentStartRef.current = performance.now();
    setElapsedMs(0);
  }, []);

  const getCurrentElapsedMs = useCallback((): number => {
    if (segmentStartRef.current !== null) {
      return accumulatedMsRef.current + (performance.now() - segmentStartRef.current);
    }
    return accumulatedMsRef.current;
  }, []);

  // Real-time level timer effect: runs only while actively playing & unpaused
  useEffect(() => {
    const active = screen === 'PLAYING' && !isPaused && !board.completed;
    if (!active) {
      if (segmentStartRef.current !== null) {
        accumulatedMsRef.current += performance.now() - segmentStartRef.current;
        segmentStartRef.current = null;
        setElapsedMs(Math.round(accumulatedMsRef.current));
      }
      return;
    }

    if (segmentStartRef.current === null) {
      segmentStartRef.current = performance.now();
    }

    const timer = window.setInterval(() => {
      if (segmentStartRef.current !== null) {
        setElapsedMs(
          Math.round(accumulatedMsRef.current + (performance.now() - segmentStartRef.current)),
        );
      }
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [screen, isPaused, board.completed]);

  useEffect(() => {
    void testFirestoreConnection();
    soundEngine.setPreferences(settings.soundEnabled, settings.musicEnabled);

    const unlockAudio = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      soundEngine.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const synced = await syncProgressWithCloud(nextUser, loadLocalProgress());
          setProgress(synced.progress);
          setUsername(synced.username);
        } catch (err) {
          console.warn('Cloud sync deferred:', err);
        }
      } else {
        setUsername(loadGuestName());
      }
    });
    return () => unsub();
  }, []);

  const handleUpdateSettings = useCallback((next: PlayerSettings) => {
    soundEngine.playClick();
    setSettings(next);
    saveSettings(next);
    soundEngine.setPreferences(next.soundEnabled, next.musicEnabled);
  }, []);

  const startLevel = useCallback(
    async (levelId: number) => {
      const clampedId = Math.min(LEVELS.length, Math.max(1, levelId));
      const lvl = getLevelById(clampedId);
      completionHandledRef.current = false;
      setCompletionResult(null);
      setSavingCompletion(false);
      setIsPaused(false);
      setCurrentLevelId(clampedId);
      saveLastPlayedLevel(clampedId);
      setBoard(parseLevelState(lvl));
      resetTimer();
      setScreen('PLAYING');

      sessionIdRef.current = await startCloudSession(user, clampedId);
    },
    [resetTimer, user],
  );

  const handleMove = useCallback(
    (direction: Direction) => {
      if (isPaused) return;
      setBoard((prev) => {
        if (prev.completed) return prev;
        const next = applyMove(prev, direction);

        if (next.lastAction.type === 'move') {
          soundEngine.playMove();
        } else if (next.lastAction.type === 'push') {
          soundEngine.playPush(next.lastAction.reachedTarget);
        } else if (next.lastAction.type === 'bump') {
          soundEngine.playBump();
        }

        if (next.completed && !prev.completed && !completionHandledRef.current) {
          completionHandledRef.current = true;
          const finalElapsedMs = Math.max(100, Math.round(getCurrentElapsedMs()));
          if (segmentStartRef.current !== null) {
            accumulatedMsRef.current = finalElapsedMs;
            segmentStartRef.current = null;
          }
          setElapsedMs(finalElapsedMs);

          soundEngine.playLevelComplete();
          setSavingCompletion(true);
          void saveLevelCompletion({
            user,
            username,
            levelId: next.levelId,
            moveSequence: next.moveSequence,
            elapsedMs: finalElapsedMs,
            currentProgress: progress,
            sessionId: sessionIdRef.current,
          })
            .then((result) => {
              setProgress(result.progress);
              setCompletionResult(result);
            })
            .catch((err) => {
              console.error('Failed saving completion:', err);
            })
            .finally(() => {
              setSavingCompletion(false);
            });
        }

        return next;
      });
    },
    [getCurrentElapsedMs, isPaused, progress, user, username],
  );

  const handleUndo = useCallback(() => {
    if (isPaused) return;
    setBoard((prev) => {
      if (prev.completed || prev.history.length === 0) return prev;
      soundEngine.playUndo();
      return undoLastMove(prev);
    });
  }, [isPaused]);

  const handleRestart = useCallback(() => {
    soundEngine.playClick();
    completionHandledRef.current = false;
    setCompletionResult(null);
    setSavingCompletion(false);
    setIsPaused(false);
    const lvl = getLevelById(currentLevelId);
    setBoard(resetBoardState(lvl));
    resetTimer();
    void startCloudSession(user, currentLevelId).then((sid) => {
      sessionIdRef.current = sid;
    });
  }, [currentLevelId, resetTimer, user]);

  const handleNextLevel = useCallback(() => {
    soundEngine.playClick();
    if (currentLevelId < LEVELS.length) {
      void startLevel(currentLevelId + 1);
    }
  }, [currentLevelId, startLevel]);

  const handleSignIn = useCallback(async () => {
    soundEngine.playClick();
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.warn('Sign-in cancelled or failed:', err);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    soundEngine.playClick();
    setAuthBusy(true);
    try {
      await signOutPlayer();
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSaveUsername = useCallback(
    async (newName: string) => {
      soundEngine.playClick();
      if (user) {
        const saved = await updateCloudUsername(user, newName);
        setUsername(saved);
      } else {
        const saved = saveGuestName(newName);
        setUsername(saved);
      }
    },
    [user],
  );

  const handleResetProgress = useCallback(async () => {
    soundEngine.playClick();
    const fresh = await resetAllProgress(user);
    setProgress(fresh);
    setCurrentLevelId(1);
    setBoard(parseLevelState(getLevelById(1)));
    resetTimer();
  }, [resetTimer, user]);

  const activeLevel = getLevelById(currentLevelId);
  const completedCount = countCompletedLevels(progress);
  const continueLevelId = Math.min(
    Math.max(1, loadLastPlayedLevel()),
    progress.unlockedLevel,
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0F172A]">
      {screen === 'MAIN_MENU' && (
        <MainMenuScreen
          user={user}
          username={username}
          unlockedLevel={progress.unlockedLevel}
          completedCount={completedCount}
          continueLevelId={continueLevelId}
          authBusy={authBusy}
          onPlayNew={() => {
            soundEngine.playClick();
            void startLevel(1);
          }}
          onContinue={() => {
            soundEngine.playClick();
            void startLevel(continueLevelId);
          }}
          onOpenLevels={() => {
            soundEngine.playClick();
            setScreen('LEVEL_SELECT');
          }}
          onOpenLeaderboard={() => {
            soundEngine.playClick();
            setLeaderboardLevelId(continueLevelId);
            setScreen('LEADERBOARD');
          }}
          onOpenHowToPlay={() => {
            soundEngine.playClick();
            setScreen('HOW_TO_PLAY');
          }}
          onOpenSettings={() => {
            soundEngine.playClick();
            setScreen('SETTINGS');
          }}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
        />
      )}

      {screen === 'LEVEL_SELECT' && (
        <LevelSelectScreen
          progress={progress}
          onSelectLevel={(id) => {
            soundEngine.playClick();
            void startLevel(id);
          }}
          onBack={() => {
            soundEngine.playClick();
            setScreen('MAIN_MENU');
          }}
        />
      )}

      {screen === 'PLAYING' && (
        <GameplayScreen
          level={activeLevel}
          board={board}
          elapsedMs={elapsedMs}
          bestMoves={progress.levels[activeLevel.id]?.bestMoves ?? null}
          bestTimeMs={progress.levels[activeLevel.id]?.bestTimeMs ?? null}
          settings={settings}
          isPaused={isPaused}
          completionResult={completionResult}
          savingCompletion={savingCompletion}
          onMove={handleMove}
          onUndo={handleUndo}
          onRestart={handleRestart}
          onTogglePause={() => {
            soundEngine.playClick();
            setIsPaused((p) => !p);
          }}
          onToggleSound={() =>
            handleUpdateSettings({
              ...settings,
              soundEnabled: !settings.soundEnabled,
            })
          }
          onToggleMusic={() =>
            handleUpdateSettings({
              ...settings,
              musicEnabled: !settings.musicEnabled,
            })
          }
          onNextLevel={handleNextLevel}
          onExitToMenu={() => {
            soundEngine.playClick();
            setIsPaused(false);
            setScreen('MAIN_MENU');
          }}
          onExitToLevels={() => {
            soundEngine.playClick();
            setIsPaused(false);
            setScreen('LEVEL_SELECT');
          }}
          onOpenLeaderboard={(lvlId) => {
            soundEngine.playClick();
            setIsPaused(false);
            setLeaderboardLevelId(lvlId);
            setScreen('LEADERBOARD');
          }}
        />
      )}

      {screen === 'HOW_TO_PLAY' && (
        <HowToPlayScreen
          onBack={() => {
            soundEngine.playClick();
            setScreen('MAIN_MENU');
          }}
          onStartPlaying={() => {
            soundEngine.playClick();
            void startLevel(continueLevelId);
          }}
        />
      )}

      {screen === 'SETTINGS' && (
        <SettingsScreen
          user={user}
          username={username}
          settings={settings}
          authBusy={authBusy}
          onUpdateSettings={handleUpdateSettings}
          onSaveUsername={handleSaveUsername}
          onResetProgress={handleResetProgress}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
          onBack={() => {
            soundEngine.playClick();
            setScreen('MAIN_MENU');
          }}
        />
      )}

      {screen === 'LEADERBOARD' && (
        <LeaderboardScreen
          initialLevelId={leaderboardLevelId}
          currentUserId={user?.uid}
          onPlayLevel={(lvlId) => {
            soundEngine.playClick();
            if (lvlId <= progress.unlockedLevel) {
              void startLevel(lvlId);
            } else {
              setScreen('LEVEL_SELECT');
            }
          }}
          onBack={() => {
            soundEngine.playClick();
            setScreen('MAIN_MENU');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BoxboundApp />
    </ErrorBoundary>
  );
}

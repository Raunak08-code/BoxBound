import { type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getLevelById, LEVELS } from '../engine/levels.ts';
import { verifySolutionReplay } from '../engine/sokoban.ts';
import type {
  Direction,
  LeaderboardEntry,
  LevelProgressRecord,
  PlayerSettings,
} from '../engine/types.ts';
import { db, handleFirestoreError, OperationType } from './firebase.ts';

const PROGRESS_STORAGE_KEY = 'boxbound_progress_v1';
const SETTINGS_STORAGE_KEY = 'boxbound_settings_v1';
const LAST_LEVEL_STORAGE_KEY = 'boxbound_last_level_v1';
const GUEST_NAME_STORAGE_KEY = 'boxbound_guest_name_v1';

export const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  musicEnabled: true,
  dpadLayout: 'split',
  showHints: true,
};

export interface LocalProgressStore {
  unlockedLevel: number;
  levels: Record<number, LevelProgressRecord>;
}

export function createInitialProgress(): LocalProgressStore {
  const levels: Record<number, LevelProgressRecord> = {};
  for (const lvl of LEVELS) {
    levels[lvl.id] = {
      levelId: lvl.id,
      completed: false,
      bestMoves: null,
      bestTimeMs: null,
      completedAt: null,
    };
  }
  return {
    unlockedLevel: 1,
    levels,
  };
}

export function loadLocalProgress(): LocalProgressStore {
  if (typeof window === 'undefined') return createInitialProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as Partial<LocalProgressStore>;
    const base = createInitialProgress();
    const unlockedLevel =
      typeof parsed.unlockedLevel === 'number'
        ? Math.min(LEVELS.length, Math.max(1, Math.floor(parsed.unlockedLevel)))
        : 1;

    const mergedLevels = { ...base.levels };
    if (parsed.levels && typeof parsed.levels === 'object') {
      for (const lvl of LEVELS) {
        const rec = parsed.levels[lvl.id];
        if (rec && typeof rec.completed === 'boolean') {
          mergedLevels[lvl.id] = {
            levelId: lvl.id,
            completed: rec.completed,
            bestMoves:
              typeof rec.bestMoves === 'number' && rec.bestMoves >= 1
                ? Math.floor(rec.bestMoves)
                : null,
            bestTimeMs:
              typeof rec.bestTimeMs === 'number' && rec.bestTimeMs >= 100
                ? Math.floor(rec.bestTimeMs)
                : null,
            completedAt: typeof rec.completedAt === 'string' ? rec.completedAt : null,
          };
        }
      }
    }
    return { unlockedLevel, levels: mergedLevels };
  } catch {
    return createInitialProgress();
  }
}

export function saveLocalProgress(progress: LocalProgressStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadSettings(): PlayerSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
    return {
      soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
      musicEnabled: parsed.musicEnabled ?? DEFAULT_SETTINGS.musicEnabled,
      dpadLayout: parsed.dpadLayout === 'compact' ? 'compact' : 'split',
      showHints: parsed.showHints ?? DEFAULT_SETTINGS.showHints,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PlayerSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadLastPlayedLevel(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(LAST_LEVEL_STORAGE_KEY);
    const num = raw ? parseInt(raw, 10) : 1;
    if (Number.isInteger(num) && num >= 1 && num <= LEVELS.length) {
      return num;
    }
    return 1;
  } catch {
    return 1;
  }
}

export function saveLastPlayedLevel(levelId: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_LEVEL_STORAGE_KEY, String(levelId));
  } catch {
    // Ignore
  }
}

export function loadGuestName(): string {
  if (typeof window === 'undefined') return 'Keeper';
  const stored = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored.trim().slice(0, 32) : 'Keeper';
}

export function saveGuestName(name: string): string {
  const clean = sanitizeUsername(name);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, clean);
  }
  return clean;
}

export function sanitizeUsername(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'Keeper';
  return trimmed.slice(0, 32);
}

export function countCompletedLevels(progress: LocalProgressStore): number {
  return Object.values(progress.levels).filter((l) => l.completed).length;
}

export async function ensureUserProfile(
  user: User,
  localProgress: LocalProgressStore,
): Promise<{ username: string; unlockedLevel: number }> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const fallbackName = sanitizeUsername(user.displayName || user.email?.split('@')[0]);
    if (!snap.exists()) {
      const unlocked = Math.min(LEVELS.length, Math.max(1, localProgress.unlockedLevel));
      const totalCompleted = countCompletedLevels(localProgress);
      await setDoc(userRef, {
        uid: user.uid,
        username: fallbackName,
        unlockedLevel: unlocked,
        totalCompleted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { username: fallbackName, unlockedLevel: unlocked };
    }
    const data = snap.data();
    return {
      username: sanitizeUsername(typeof data.username === 'string' ? data.username : fallbackName),
      unlockedLevel:
        typeof data.unlockedLevel === 'number'
          ? Math.min(LEVELS.length, Math.max(1, data.unlockedLevel))
          : 1,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function updateCloudUsername(user: User, newName: string): Promise<string> {
  const clean = sanitizeUsername(newName);
  const userPath = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      username: clean,
      updatedAt: serverTimestamp(),
    });
    return clean;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function syncProgressWithCloud(
  user: User,
  localProgress: LocalProgressStore,
): Promise<{ progress: LocalProgressStore; username: string }> {
  const { username, unlockedLevel: cloudUnlocked } = await ensureUserProfile(user, localProgress);
  const levelsPath = `users/${user.uid}/levels`;
  const merged = {
    unlockedLevel: Math.max(localProgress.unlockedLevel, cloudUnlocked),
    levels: { ...localProgress.levels },
  };

  try {
    const levelsCol = collection(db, 'users', user.uid, 'levels');
    const q = query(levelsCol, where('playerId', '==', user.uid));
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const lvlId = typeof data.levelId === 'number' ? data.levelId : 0;
      if (lvlId >= 1 && lvlId <= LEVELS.length) {
        const localRec = merged.levels[lvlId];
        const cloudBest = typeof data.bestMoves === 'number' ? data.bestMoves : null;
        const cloudTime = typeof data.bestTimeMs === 'number' ? data.bestTimeMs : null;

        const bestMoves =
          localRec?.bestMoves != null && cloudBest != null
            ? Math.min(localRec.bestMoves, cloudBest)
            : (cloudBest ?? localRec?.bestMoves ?? null);

        const bestTimeMs =
          localRec?.bestTimeMs != null && cloudTime != null
            ? Math.min(localRec.bestTimeMs, cloudTime)
            : (cloudTime ?? localRec?.bestTimeMs ?? null);

        const completed = Boolean(data.completed) || Boolean(localRec?.completed);

        merged.levels[lvlId] = {
          levelId: lvlId,
          completed,
          bestMoves,
          bestTimeMs,
          completedAt: localRec?.completedAt ?? new Date().toISOString(),
        };
        if (completed && lvlId < LEVELS.length) {
          merged.unlockedLevel = Math.max(merged.unlockedLevel, lvlId + 1);
        }
      }
    });

    for (const lvl of LEVELS) {
      const rec = merged.levels[lvl.id];
      if (rec?.completed && rec.bestMoves != null) {
        const cloudDocExists = snap.docs.some((d) => d.id === `level_${lvl.id}`);
        if (!cloudDocExists) {
          await setDoc(doc(db, 'users', user.uid, 'levels', `level_${lvl.id}`), {
            playerId: user.uid,
            levelId: lvl.id,
            completed: true,
            bestMoves: rec.bestMoves,
            ...(rec.bestTimeMs != null ? { bestTimeMs: rec.bestTimeMs } : {}),
            completedAt: serverTimestamp(),
          });
        }
      }
    }

    const totalCompleted = countCompletedLevels(merged);
    await updateDoc(doc(db, 'users', user.uid), {
      unlockedLevel: Math.min(LEVELS.length, Math.max(1, merged.unlockedLevel)),
      totalCompleted,
      updatedAt: serverTimestamp(),
    });

    saveLocalProgress(merged);
    return { progress: merged, username };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, levelsPath);
  }
}

export async function startCloudSession(user: User | null, levelId: number): Promise<string | null> {
  if (!user) return null;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'sessions', sessionId), {
      sessionId,
      playerId: user.uid,
      levelId,
      status: 'active',
      moveCount: 0,
      elapsedMs: 0,
      startedAt: serverTimestamp(),
    });
    return sessionId;
  } catch (error) {
    console.warn('Could not start cloud session:', error);
    return null;
  }
}

export interface SaveCompletionResult {
  progress: LocalProgressStore;
  verifiedByServer: boolean;
  isNewBest: boolean;
  isNewBestTime: boolean;
  previousBest: number | null;
  previousBestTimeMs: number | null;
  verifiedMoves: number;
  elapsedMs: number;
  cloudSynced: boolean;
}

export async function saveLevelCompletion(params: {
  user: User | null;
  username: string;
  levelId: number;
  moveSequence: Direction[];
  elapsedMs: number;
  currentProgress: LocalProgressStore;
  sessionId: string | null;
}): Promise<SaveCompletionResult> {
  const { user, username, levelId, moveSequence, elapsedMs, currentProgress, sessionId } = params;
  const clampedElapsedMs = Math.min(36000000, Math.max(100, Math.round(elapsedMs)));
  const level = getLevelById(levelId);

  let verifiedByServer = false;
  let verifiedMoves = moveSequence.length;

  try {
    const resp = await fetch('/api/validate-solution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId, moveSequence }),
    });
    if (resp.ok) {
      const json = (await resp.json()) as { valid: boolean; moves: number };
      if (!json.valid) {
        throw new Error('Server rejected invalid solution sequence.');
      }
      verifiedMoves = json.moves;
      verifiedByServer = true;
    } else if (resp.status === 422 || resp.status === 400) {
      throw new Error('Solution validation failed.');
    } else {
      throw new Error('Validation service unavailable.');
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'Solution validation failed.') {
      throw err;
    }
    const localVerify = verifySolutionReplay(level, moveSequence);
    if (!localVerify.valid) {
      throw new Error(localVerify.reason || 'Invalid solution.');
    }
    verifiedMoves = localVerify.moves;
  }

  const prevRecord = currentProgress.levels[levelId];
  const previousBest = prevRecord?.bestMoves ?? null;
  const previousBestTimeMs = prevRecord?.bestTimeMs ?? null;
  const isNewBest = previousBest === null || verifiedMoves < previousBest;
  const isNewBestTime = previousBestTimeMs === null || clampedElapsedMs < previousBestTimeMs;

  const nextBest = previousBest === null ? verifiedMoves : Math.min(previousBest, verifiedMoves);
  const nextBestTime =
    previousBestTimeMs === null ? clampedElapsedMs : Math.min(previousBestTimeMs, clampedElapsedMs);

  const nextUnlocked = Math.min(
    LEVELS.length,
    Math.max(currentProgress.unlockedLevel, levelId < LEVELS.length ? levelId + 1 : LEVELS.length),
  );

  const nextProgress: LocalProgressStore = {
    unlockedLevel: nextUnlocked,
    levels: {
      ...currentProgress.levels,
      [levelId]: {
        levelId,
        completed: true,
        bestMoves: nextBest,
        bestTimeMs: nextBestTime,
        completedAt: new Date().toISOString(),
      },
    },
  };

  saveLocalProgress(nextProgress);

  let cloudSynced = false;
  if (user) {
    const levelKey = `level_${levelId}`;
    const levelPath = `users/${user.uid}/levels/${levelKey}`;
    try {
      await ensureUserProfile(user, nextProgress);

      const levelRef = doc(db, 'users', user.uid, 'levels', levelKey);
      const existingLevelSnap = await getDoc(levelRef);
      if (!existingLevelSnap.exists()) {
        await setDoc(levelRef, {
          playerId: user.uid,
          levelId,
          completed: true,
          bestMoves: nextBest,
          bestTimeMs: nextBestTime,
          completedAt: serverTimestamp(),
        });
      } else {
        const existingBest = existingLevelSnap.data().bestMoves as number;
        const existingTime = existingLevelSnap.data().bestTimeMs as number | undefined;
        if (nextBest < existingBest || (nextBest === existingBest && (existingTime == null || nextBestTime < existingTime))) {
          await updateDoc(levelRef, {
            completed: true,
            bestMoves: nextBest,
            bestTimeMs: nextBestTime,
            completedAt: serverTimestamp(),
          });
        }
      }

      await updateDoc(doc(db, 'users', user.uid), {
        unlockedLevel: nextUnlocked,
        totalCompleted: countCompletedLevels(nextProgress),
        updatedAt: serverTimestamp(),
      });

      if (sessionId) {
        const sessRef = doc(db, 'users', user.uid, 'sessions', sessionId);
        await updateDoc(sessRef, {
          status: 'completed',
          moveCount: verifiedMoves,
          elapsedMs: clampedElapsedMs,
          completedAt: serverTimestamp(),
        }).catch(() => {});
      }

      const moveString = moveSequence.join('');
      if (moveString.length === verifiedMoves && moveString.length <= 2000) {
        const lbId = `${levelId}_${user.uid}`;
        const lbRef = doc(db, 'leaderboard', lbId);
        const lbSnap = await getDoc(lbRef);
        const cleanUser = sanitizeUsername(username);
        if (!lbSnap.exists()) {
          await setDoc(lbRef, {
            playerId: user.uid,
            username: cleanUser,
            levelId,
            bestMoves: verifiedMoves,
            bestTimeMs: clampedElapsedMs,
            verifiedMoves: moveString,
            updatedAt: serverTimestamp(),
          });
        } else {
          const prevLbBest = lbSnap.data().bestMoves as number;
          const prevLbTime = lbSnap.data().bestTimeMs as number | undefined;
          if (
            verifiedMoves < prevLbBest ||
            (verifiedMoves === prevLbBest && (prevLbTime == null || clampedElapsedMs < prevLbTime))
          ) {
            await updateDoc(lbRef, {
              username: cleanUser,
              bestMoves: verifiedMoves,
              bestTimeMs: prevLbTime != null ? Math.min(prevLbTime, clampedElapsedMs) : clampedElapsedMs,
              verifiedMoves: moveString,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      cloudSynced = true;
    } catch (error) {
      console.warn('Cloud progress sync failed; local progress preserved:', error);
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, levelPath);
      }
    }
  }

  return {
    progress: nextProgress,
    verifiedByServer,
    isNewBest,
    isNewBestTime,
    previousBest,
    previousBestTimeMs,
    verifiedMoves,
    elapsedMs: clampedElapsedMs,
    cloudSynced,
  };
}

export async function fetchLeaderboard(levelId: number): Promise<LeaderboardEntry[]> {
  const path = 'leaderboard';
  try {
    const lbQuery = query(
      collection(db, 'leaderboard'),
      where('levelId', '==', levelId),
      orderBy('bestMoves', 'asc'),
      limit(20),
    );
    const snap = await getDocs(lbQuery);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const ts = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : '';
      return {
        id: docSnap.id,
        playerId: String(data.playerId ?? ''),
        username: String(data.username ?? 'Keeper'),
        levelId: Number(data.levelId ?? levelId),
        bestMoves: Number(data.bestMoves ?? 0),
        bestTimeMs: typeof data.bestTimeMs === 'number' ? data.bestTimeMs : null,
        updatedAt: ts,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    throw error;
  }
}

export async function resetAllProgress(user: User | null): Promise<LocalProgressStore> {
  const fresh = createInitialProgress();
  saveLocalProgress(fresh);
  saveLastPlayedLevel(1);

  if (user) {
    try {
      const levelsSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'levels'), where('playerId', '==', user.uid)),
      );
      const batch = writeBatch(db);
      levelsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      await updateDoc(doc(db, 'users', user.uid), {
        unlockedLevel: 1,
        totalCompleted: 0,
        updatedAt: serverTimestamp(),
      });

      for (const lvl of LEVELS) {
        const lbRef = doc(db, 'leaderboard', `${lvl.id}_${user.uid}`);
        await deleteDoc(lbRef).catch(() => {});
      }
    } catch (error) {
      console.warn('Cloud reset encountered an issue:', error);
    }
  }

  return fresh;
}

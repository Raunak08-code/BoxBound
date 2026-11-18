/**
 * Phase 0 Payload-First Security TDD specification for BOXBOUND Firestore rules.
 * Documents the 12 adversarial Dirty Dozen test vectors verified against firestore.rules.
 */
export interface DirtyDozenCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated level progress write',
    targetPath: '/users/attacker/levels/level_1',
    operation: 'create',
    payload: { playerId: 'attacker', levelId: 1, completed: true, bestMoves: 9 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'UID spoofing on profile creation',
    targetPath: '/users/victim',
    operation: 'create',
    payload: { uid: 'victim', username: 'spoofer', unlockedLevel: 10, totalCompleted: 10 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow field injection (isAdmin)',
    targetPath: '/users/u1',
    operation: 'create',
    payload: { uid: 'u1', username: 'player', unlockedLevel: 1, totalCompleted: 0, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Oversized username string DoS (1000 chars)',
    targetPath: '/users/u1',
    operation: 'create',
    payload: { uid: 'u1', username: 'A'.repeat(1000), unlockedLevel: 1, totalCompleted: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path variable ID poisoning',
    targetPath: '/users/u1/sessions/bad$id!',
    operation: 'create',
    payload: { sessionId: 'bad$id!', playerId: 'u1', levelId: 1, status: 'active', moveCount: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unverified email user leaderboard write',
    targetPath: '/leaderboard/1_u1',
    operation: 'create',
    payload: { playerId: 'u1', username: 'unverified', levelId: 1, bestMoves: 9, verifiedMoves: 'RRRDLDDLL' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged playerId on leaderboard entry',
    targetPath: '/leaderboard/1_victim',
    operation: 'create',
    payload: { playerId: 'victim', username: 'thief', levelId: 1, bestMoves: 9, verifiedMoves: 'RRRDLDDLL' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Fake move count mismatching verifiedMoves length',
    targetPath: '/leaderboard/1_u1',
    operation: 'create',
    payload: { playerId: 'u1', username: 'cheater', levelId: 1, bestMoves: 1, verifiedMoves: 'RRRDLDDLL' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Illegal direction token in verifiedMoves',
    targetPath: '/leaderboard/1_u1',
    operation: 'create',
    payload: { playerId: 'u1', username: 'cheater', levelId: 1, bestMoves: 4, verifiedMoves: 'XXXX' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client-forged createdAt timestamp',
    targetPath: '/users/u1',
    operation: 'create',
    payload: { uid: 'u1', username: 'player', unlockedLevel: 1, totalCompleted: 0, createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Immutable startedAt mutated on session update',
    targetPath: '/users/u1/sessions/sess_1',
    operation: 'update',
    payload: { status: 'completed', moveCount: 9, startedAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Terminal state tampering (completed -> active)',
    targetPath: '/users/u1/sessions/sess_1',
    operation: 'update',
    payload: { status: 'active', moveCount: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
];

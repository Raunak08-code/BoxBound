# BOXBOUND Security Specification

## 1. Data Invariants
1. A `PlayerProfile` at `/users/{userId}` can only be read, created, updated, or deleted by the authenticated owner whose `request.auth.uid == userId`, with `email_verified == true`, and must contain no PII fields (no `email`, `phone`, `address`).
2. `unlockedLevel` must always stay within `1..10`, and `totalCompleted` within `0..10`.
3. A `LevelProgress` document at `/users/{userId}/levels/{levelKey}` must match `levelKey == 'level_' + string(levelId)`, have `playerId == userId`, and `bestMoves` must be an integer between `1` and `9999`.
4. A `GameSession` document at `/users/{userId}/sessions/{sessionId}` must have `playerId == userId`, `status` in `['active', 'completed', 'abandoned']`, and once `status == 'completed'`, it cannot transition back to `'active'`.
5. A `LeaderboardEntry` at `/leaderboard/{entryId}` must use deterministic key `entryId == string(levelId) + '_' + request.auth.uid`, enforce `verifiedMoves` matching `^[UDLR]+$` with `verifiedMoves.size() == bestMoves`, and only allow updates if the incoming `bestMoves <= existing().bestMoves` (or if the same owner updates their username/record without spoofing another user).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/users/attacker/levels/level_1`
2. Spoofed `uid` in `/users/victim`: `{ uid: "victim", username: "hack", ... }` by `attacker`
3. Shadow field injection on `/users/u1`: `{ ..., isAdmin: true }`
4. Oversized string DoS on `username` (1000 chars) in `/users/u1`
5. Invalid ID path poisoning on `/users/u1/sessions/bad$id!`
6. Unverified email user attempting to create a leaderboard entry
7. Forged `playerId` on `/leaderboard/1_victim` written by `attacker`
8. Fake leaderboard score `{ bestMoves: 1, verifiedMoves: "UDLRUDLRUDLR" }` where `verifiedMoves.size() != bestMoves`
9. Illegal move token in `verifiedMoves`: `{ verifiedMoves: "XXXX", bestMoves: 4 }`
10. Client-forged timestamp (`createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`)
11. Immutable `createdAt` or `startedAt` mutated on update
12. Terminal state tampering: updating a `completed` `GameSession` back to `active`

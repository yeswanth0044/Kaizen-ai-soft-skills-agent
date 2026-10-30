# KAIZEN – Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: Every read and write operation requires an authenticated user with `request.auth.token.email_verified == true`.
3. **PII Split Isolation**: `/users/{userId}` stores `email` and `displayName` and is strictly isolated to `request.auth.uid == userId`. No cross-user reads or list scraping are permitted (`allow list: if false;`).
4. **Relational Parent Consistency**: Creating a `UserProfile`, `PracticeSession`, `InterviewSession`, `FeedbackReport`, `SkillScore`, or `LearningActivity` requires `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
5. **Master Gate on Subcollections**: Accessing `/practiceSessions/{sessionId}/messages/{messageId}` or `/interviewSessions/{sessionId}/turns/{turnId}` verifies via `get()` that the parent session exists and its `userId == request.auth.uid`.
6. **Zero-Cost List Enforcement**: Every `allow list` rule validates `resource.data.userId == request.auth.uid` directly without calling `get()` or `exists()`.
7. **Terminal State Locking**: Once `PracticeSession.status == 'completed'` or `InterviewSession.status == 'completed'`, all subsequent `update` attempts are rejected.
8. **Temporal & Immortal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` and `userId` are immutable on updates while `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unverified Email Spoof**: Write to `/users/user_abc` with `email_verified: false` -> `PERMISSION_DENIED`.
2. **Cross-User PII Read**: Authenticated `user_evil` calls `get(/users/user_victim)` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: Create `/userProfiles/user_abc` with extra ghost field `{"isAdmin": true}` -> `PERMISSION_DENIED` (`hasOnly` check).
4. **Identity Spoofing on Session**: `user_evil` creates `/practiceSessions/sess_1` with `userId: "user_victim"` -> `PERMISSION_DENIED`.
5. **Orphaned Subcollection Write**: `user_evil` writes message into `/practiceSessions/victim_sess/messages/msg_1` with `userId: "user_evil"` -> `PERMISSION_DENIED` (Master Gate parent `get()` mismatch).
6. **ID Poisoning Attack**: Create `/practiceSessions/{200-char-junk-id}` -> `PERMISSION_DENIED` (`isValidId` check).
7. **Denial-of-Wallet Oversized String**: Create `SessionMessage` with 50,000-character `content` -> `PERMISSION_DENIED` (`size() <= 8000` check).
8. **Unbounded Array Flood**: Update `UserProfile.focusAreas` with 25 elements -> `PERMISSION_DENIED` (`size() <= 6` check).
9. **Terminal State Re-opening**: Update a `completed` `InterviewSession` back to `active` or change `overallScore` -> `PERMISSION_DENIED` (`existing().status != 'completed'`).
10. **Forged Client Timestamp**: Create `LearningActivity` with past/future `createdAt` != `request.time` -> `PERMISSION_DENIED`.
11. **Immortal Field Mutation**: Update `PracticeSession` modifying `createdAt` or `sessionType` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Query `collection('feedbackReports')` without `where('userId', '==', uid)` -> `PERMISSION_DENIED` (`resource.data.userId == request.auth.uid`).

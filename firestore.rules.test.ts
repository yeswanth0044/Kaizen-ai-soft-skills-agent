/**
 * Adversarial Security Rules Verification Suite ("Dirty Dozen" Payloads)
 * Verifies all 12 attack vectors defined in security_spec.md return PERMISSION_DENIED.
 */
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

export async function runSecurityAuditSuite() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'kaizen-security-audit',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    const unverifiedAlice = testEnv.authenticatedContext('alice_1', {
      email: 'alice@example.com',
      email_verified: false,
    });
    const verifiedAlice = testEnv.authenticatedContext('alice_1', {
      email: 'alice@example.com',
      email_verified: true,
    });
    const verifiedMallory = testEnv.authenticatedContext('mallory_1', {
      email: 'mallory@example.com',
      email_verified: true,
    });

    // Baseline valid setup for Alice
    await assertSucceeds(
      setDoc(doc(verifiedAlice.firestore(), 'users', 'alice_1'), {
        uid: 'alice_1',
        email: 'alice@example.com',
        displayName: 'Alice Rivera',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 1. Unverified Email Spoof
    await assertFails(
      setDoc(doc(unverifiedAlice.firestore(), 'users', 'alice_1'), {
        uid: 'alice_1',
        email: 'alice@example.com',
        displayName: 'Spoofed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 2. Cross-User PII Read
    await assertFails(getDoc(doc(verifiedMallory.firestore(), 'users', 'alice_1')));

    // 3. Shadow Field Injection
    await assertFails(
      setDoc(doc(verifiedAlice.firestore(), 'userProfiles', 'alice_1'), {
        userId: 'alice_1',
        displayName: 'Alice Rivera',
        headline: 'CS Student',
        learningGoal: 'Ace behavioral interviews',
        dailyGoalMinutes: 20,
        preferredDifficulty: 'Intermediate',
        focusAreas: ['Communication'],
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: '2026-10-29',
        totalSessions: 0,
        communicationScore: 0,
        interviewReadinessScore: 0,
        isAdmin: true, // Ghost field
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 4. Identity Spoofing on Session
    await assertFails(
      setDoc(doc(verifiedMallory.firestore(), 'practiceSessions', 'sess_spoof'), {
        userId: 'alice_1',
        sessionType: 'coach',
        title: 'Spoofed Session',
        scenarioId: 'general',
        difficulty: 'Beginner',
        status: 'active',
        messageCount: 0,
        latestScore: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Seed valid session for Alice
    await assertSucceeds(
      setDoc(doc(verifiedAlice.firestore(), 'practiceSessions', 'sess_alice_1'), {
        userId: 'alice_1',
        sessionType: 'coach',
        title: 'Executive Presence',
        scenarioId: 'general',
        difficulty: 'Intermediate',
        status: 'completed',
        messageCount: 2,
        latestScore: 84,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 5. Orphaned / Cross-Tenant Subcollection Write
    await assertFails(
      setDoc(
        doc(verifiedMallory.firestore(), 'practiceSessions', 'sess_alice_1', 'messages', 'msg_1'),
        {
          sessionId: 'sess_alice_1',
          userId: 'mallory_1',
          role: 'user',
          content: 'Injected cross-tenant message',
          score: 0,
          improvedResponse: '',
          grammarNotes: [],
          clarityNote: '',
          createdAt: serverTimestamp(),
        }
      )
    );

    // 6. ID Poisoning Attack (>128 chars)
    const poisonedId = 'x'.repeat(160);
    await assertFails(
      setDoc(doc(verifiedAlice.firestore(), 'practiceSessions', poisonedId), {
        userId: 'alice_1',
        sessionType: 'coach',
        title: 'Poisoned ID',
        scenarioId: 'general',
        difficulty: 'Beginner',
        status: 'active',
        messageCount: 0,
        latestScore: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 7. Denial-of-Wallet Oversized String
    await assertFails(
      setDoc(
        doc(verifiedAlice.firestore(), 'practiceSessions', 'sess_alice_1', 'messages', 'msg_huge'),
        {
          sessionId: 'sess_alice_1',
          userId: 'alice_1',
          role: 'user',
          content: 'a'.repeat(9000),
          score: 0,
          improvedResponse: '',
          grammarNotes: [],
          clarityNote: '',
          createdAt: serverTimestamp(),
        }
      )
    );

    // 8. Unbounded Array Flood
    await assertFails(
      setDoc(doc(verifiedAlice.firestore(), 'userProfiles', 'alice_1'), {
        userId: 'alice_1',
        displayName: 'Alice Rivera',
        headline: 'CS Student',
        learningGoal: 'Practice daily',
        dailyGoalMinutes: 20,
        preferredDifficulty: 'Intermediate',
        focusAreas: ['1', '2', '3', '4', '5', '6', '7', '8'],
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: '2026-10-29',
        totalSessions: 0,
        communicationScore: 0,
        interviewReadinessScore: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 9. Terminal State Re-opening on completed session
    await assertFails(
      updateDoc(doc(verifiedAlice.firestore(), 'practiceSessions', 'sess_alice_1'), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    // 10. Forged Client Timestamp
    await assertFails(
      setDoc(doc(verifiedAlice.firestore(), 'learningActivities', 'act_1'), {
        userId: 'alice_1',
        activityType: 'coach',
        title: 'Forged Timestamp',
        score: 85,
        durationMinutes: 15,
        dateKey: '2026-10-29',
        sessionId: 'sess_alice_1',
        createdAt: new Date('2020-01-01T00:00:00Z'),
      })
    );

    // 11. Immortal Field Mutation
    await assertSucceeds(
      setDoc(doc(verifiedAlice.firestore(), 'practiceSessions', 'sess_active_1'), {
        userId: 'alice_1',
        sessionType: 'coach',
        title: 'Active Session',
        scenarioId: 'general',
        difficulty: 'Beginner',
        status: 'active',
        messageCount: 1,
        latestScore: 78,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(verifiedAlice.firestore(), 'practiceSessions', 'sess_active_1'), {
        sessionType: 'presentation',
        updatedAt: serverTimestamp(),
      })
    );

    // 12. Blanket Unfiltered List Scraping
    await assertFails(getDocs(collection(verifiedMallory.firestore(), 'feedbackReports')));
  } finally {
    await testEnv.cleanup();
  }
}

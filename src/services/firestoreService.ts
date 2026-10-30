import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { SKILL_DEFINITIONS } from '../data/scenarios.ts';
import type {
  DifficultyLevel,
  FeedbackReport,
  InterviewCategory,
  InterviewSession,
  InterviewTurn,
  LearningActivity,
  PracticeSession,
  SessionMessage,
  SessionType,
  SkillKey,
  SkillScore,
  UserProfile,
} from '../types/kaizen.ts';

// ============================================================================
// Defensive Sanitization Helpers (Verbatim synced with firebase-blueprint.json)
// ============================================================================
function clampStr(value: string | undefined | null, maxLen: number, fallback = ''): string {
  const clean = (value ?? '').trim();
  const base = clean.length > 0 ? clean : fallback;
  return base.slice(0, maxLen);
}

function clampInt(value: number | undefined | null, min: number, max: number): number {
  const num = Number.isFinite(value) ? Math.round(Number(value)) : min;
  return Math.max(min, Math.min(max, num));
}

function clampStringList(
  items: string[] | undefined | null,
  maxItems: number,
  maxItemLen: number
): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((s) => String(s || '').trim().slice(0, maxItemLen))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateKey(date = new Date()): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return getTodayDateKey(copy);
}

// ============================================================================
// 1. User Account & Profile Initialization + Settings
// ============================================================================
export async function ensureUserInitialized(
  user: User,
  preferredName?: string
): Promise<UserProfile> {
  const uid = user.uid;
  const email = clampStr(user.email, 254, 'learner@kaizen.app');
  const resolvedName = clampStr(
    preferredName || user.displayName || email.split('@')[0],
    100,
    'KAIZEN Learner'
  );

  // Step 1: Ensure /users/{uid} exists first (required by Global Consistency Invariant)
  const userPath = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email,
        displayName: resolvedName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  // Step 2: Ensure /userProfiles/{uid} exists
  const profilePath = `userProfiles/${uid}`;
  try {
    const profileRef = doc(db, 'userProfiles', uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      return {
        userId: data.userId,
        displayName: data.displayName,
        headline: data.headline,
        learningGoal: data.learningGoal,
        dailyGoalMinutes: data.dailyGoalMinutes,
        preferredDifficulty: data.preferredDifficulty,
        focusAreas: data.focusAreas || [],
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        lastActiveDate: data.lastActiveDate || '',
        totalSessions: data.totalSessions || 0,
        communicationScore: data.communicationScore || 0,
        interviewReadinessScore: data.interviewReadinessScore || 0,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    }

    const initialProfile = {
      userId: uid,
      displayName: resolvedName,
      headline: 'Aspiring Professional',
      learningGoal: 'Communicate with clarity, structure, and confidence in interviews and team discussions.',
      dailyGoalMinutes: 20,
      preferredDifficulty: 'Intermediate' as DifficultyLevel,
      focusAreas: ['Workplace Communication', 'Interview Readiness', 'Presentation & Pitching'],
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      totalSessions: 0,
      communicationScore: 0,
      interviewReadinessScore: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(profileRef, initialProfile);
    return {
      ...initialProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, profilePath);
  }
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `userProfiles/${uid}`;
  return onSnapshot(
    doc(db, 'userProfiles', uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const d = snap.data();
      onChange({
        userId: d.userId,
        displayName: d.displayName,
        headline: d.headline,
        learningGoal: d.learningGoal,
        dailyGoalMinutes: d.dailyGoalMinutes,
        preferredDifficulty: d.preferredDifficulty,
        focusAreas: d.focusAreas || [],
        currentStreak: d.currentStreak || 0,
        longestStreak: d.longestStreak || 0,
        lastActiveDate: d.lastActiveDate || '',
        totalSessions: d.totalSessions || 0,
        communicationScore: d.communicationScore || 0,
        interviewReadinessScore: d.interviewReadinessScore || 0,
        createdAt: toDate(d.createdAt),
        updatedAt: toDate(d.updatedAt),
      });
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function updateUserProfileSettings(
  uid: string,
  email: string,
  updates: {
    displayName: string;
    headline: string;
    learningGoal: string;
    dailyGoalMinutes: number;
    preferredDifficulty: DifficultyLevel;
    focusAreas: string[];
  }
): Promise<void> {
  const safeName = clampStr(updates.displayName, 100, 'KAIZEN Learner');
  const profilePath = `userProfiles/${uid}`;

  try {
    await updateDoc(doc(db, 'userProfiles', uid), {
      displayName: safeName,
      headline: clampStr(updates.headline, 160, ''),
      learningGoal: clampStr(updates.learningGoal, 300, ''),
      dailyGoalMinutes: clampInt(updates.dailyGoalMinutes, 5, 180),
      preferredDifficulty: updates.preferredDifficulty,
      focusAreas: clampStringList(updates.focusAreas, 6, 60),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, profilePath);
  }

  const userPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      email: clampStr(email, 254, 'learner@kaizen.app'),
      displayName: safeName,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

// ============================================================================
// 2. Practice Sessions & Messages (Coach, Scenarios, Presentations)
// ============================================================================
export async function createPracticeSession(params: {
  uid: string;
  sessionType: SessionType;
  title: string;
  scenarioId?: string;
  difficulty: DifficultyLevel;
}): Promise<PracticeSession> {
  const sessionsCol = collection(db, 'practiceSessions');
  const sessionRef = doc(sessionsCol);
  const path = `practiceSessions/${sessionRef.id}`;

  const payload = {
    userId: params.uid,
    sessionType: params.sessionType,
    title: clampStr(params.title, 160, 'Coaching Session'),
    scenarioId: clampStr(params.scenarioId, 80, 'general'),
    difficulty: params.difficulty,
    status: 'active' as const,
    messageCount: 0,
    latestScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(sessionRef, payload);
    return {
      id: sessionRef.id,
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function appendSessionMessage(params: {
  uid: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  score?: number;
  improvedResponse?: string;
  grammarNotes?: string[];
  clarityNote?: string;
  nextMessageCount: number;
  latestScore: number;
  updatedTitle?: string;
}): Promise<void> {
  const msgCol = collection(db, 'practiceSessions', params.sessionId, 'messages');
  const msgRef = doc(msgCol);
  const msgPath = `practiceSessions/${params.sessionId}/messages/${msgRef.id}`;

  try {
    await setDoc(msgRef, {
      sessionId: params.sessionId,
      userId: params.uid,
      role: params.role,
      content: clampStr(params.content, 8000, '...'),
      score: clampInt(params.score ?? 0, 0, 100),
      improvedResponse: clampStr(params.improvedResponse, 4000, ''),
      grammarNotes: clampStringList(params.grammarNotes, 8, 300),
      clarityNote: clampStr(params.clarityNote, 600, ''),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgPath);
  }

  const sessPath = `practiceSessions/${params.sessionId}`;
  try {
    const updatePayload: Record<string, unknown> = {
      messageCount: clampInt(params.nextMessageCount, 0, 1000),
      latestScore: clampInt(params.latestScore, 0, 100),
      updatedAt: serverTimestamp(),
    };
    if (params.updatedTitle) {
      updatePayload.title = clampStr(params.updatedTitle, 160, 'Coaching Session');
    }
    await updateDoc(doc(db, 'practiceSessions', params.sessionId), updatePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, sessPath);
  }
}

export async function appendTurnPairBatch(params: {
  uid: string;
  sessionId: string;
  userContent: string;
  assistantContent: string;
  score: number;
  improvedResponse: string;
  grammarNotes: string[];
  clarityNote: string;
  nextMessageCount: number;
  updatedTitle?: string;
}): Promise<void> {
  const path = `practiceSessions/${params.sessionId}`;
  try {
    const batch = writeBatch(db);
    const msgsCol = collection(db, 'practiceSessions', params.sessionId, 'messages');
    const userMsgRef = doc(msgsCol);
    const assistantMsgRef = doc(msgsCol);

    batch.set(userMsgRef, {
      sessionId: params.sessionId,
      userId: params.uid,
      role: 'user',
      content: clampStr(params.userContent, 8000, '...'),
      score: clampInt(params.score, 0, 100),
      improvedResponse: clampStr(params.improvedResponse, 4000, ''),
      grammarNotes: clampStringList(params.grammarNotes, 8, 300),
      clarityNote: clampStr(params.clarityNote, 600, ''),
      createdAt: serverTimestamp(),
    });

    batch.set(assistantMsgRef, {
      sessionId: params.sessionId,
      userId: params.uid,
      role: 'assistant',
      content: clampStr(params.assistantContent, 8000, '...'),
      score: 0,
      improvedResponse: '',
      grammarNotes: [],
      clarityNote: '',
      createdAt: serverTimestamp(),
    });

    const sessionUpdate: Record<string, unknown> = {
      messageCount: clampInt(params.nextMessageCount, 0, 1000),
      latestScore: clampInt(params.score, 0, 100),
      updatedAt: serverTimestamp(),
    };
    if (params.updatedTitle) {
      sessionUpdate.title = clampStr(params.updatedTitle, 160, 'Coaching Session');
    }

    batch.update(doc(db, 'practiceSessions', params.sessionId), sessionUpdate);
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function completePracticeSession(params: {
  sessionId: string;
  messageCount: number;
  latestScore: number;
}): Promise<void> {
  const path = `practiceSessions/${params.sessionId}`;
  try {
    await updateDoc(doc(db, 'practiceSessions', params.sessionId), {
      status: 'completed',
      messageCount: clampInt(params.messageCount, 0, 1000),
      latestScore: clampInt(params.latestScore, 0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePracticeSession(uid: string, sessionId: string): Promise<void> {
  const msgsPath = `practiceSessions/${sessionId}/messages`;
  try {
    const q = query(
      collection(db, 'practiceSessions', sessionId, 'messages'),
      where('userId', '==', uid)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, msgsPath);
  }

  const sessPath = `practiceSessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'practiceSessions', sessionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, sessPath);
  }
}

export function subscribePracticeSessions(
  uid: string,
  sessionType: SessionType | 'all',
  onChange: (sessions: PracticeSession[]) => void
): Unsubscribe {
  const path = 'practiceSessions';
  const q = query(collection(db, 'practiceSessions'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: PracticeSession[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: d.userId,
            sessionType: d.sessionType as SessionType,
            title: d.title,
            scenarioId: d.scenarioId || '',
            difficulty: d.difficulty as DifficultyLevel,
            status: d.status,
            messageCount: d.messageCount || 0,
            latestScore: d.latestScore || 0,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
          };
        })
        .filter((s) => sessionType === 'all' || s.sessionType === sessionType)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      onChange(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeSessionMessages(
  uid: string,
  sessionId: string,
  onChange: (messages: SessionMessage[]) => void
): Unsubscribe {
  const path = `practiceSessions/${sessionId}/messages`;
  const q = query(
    collection(db, 'practiceSessions', sessionId, 'messages'),
    where('userId', '==', uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs: SessionMessage[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            sessionId: d.sessionId,
            userId: d.userId,
            role: d.role,
            content: d.content,
            score: d.score || 0,
            improvedResponse: d.improvedResponse || '',
            grammarNotes: d.grammarNotes || [],
            clarityNote: d.clarityNote || '',
            createdAt: toDate(d.createdAt),
          };
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      onChange(msgs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

// ============================================================================
// 3. Mock Interview Sessions & Turns
// ============================================================================
export async function createInterviewSessionRecord(params: {
  uid: string;
  category: InterviewCategory;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  firstQuestion: string;
}): Promise<InterviewSession> {
  const ref = doc(collection(db, 'interviewSessions'));
  const path = `interviewSessions/${ref.id}`;
  const payload = {
    userId: params.uid,
    category: params.category,
    difficulty: params.difficulty,
    status: 'active' as const,
    totalQuestions: clampInt(params.totalQuestions, 3, 10),
    currentQuestionIndex: 0,
    currentQuestion: clampStr(params.firstQuestion, 1500, 'Tell me about yourself.'),
    overallScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
    return {
      id: ref.id,
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function recordInterviewTurnAndAdvance(params: {
  uid: string;
  sessionId: string;
  questionIndex: number;
  question: string;
  answer: string;
  score: number;
  relevanceScore: number;
  clarityScore: number;
  grammarScore: number;
  structureScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  correctedAnswer: string;
  isCompleted: boolean;
  nextQuestion: string;
  runningOverallScore: number;
}): Promise<void> {
  const turnRef = doc(collection(db, 'interviewSessions', params.sessionId, 'turns'));
  const turnPath = `interviewSessions/${params.sessionId}/turns/${turnRef.id}`;

  try {
    await setDoc(turnRef, {
      sessionId: params.sessionId,
      userId: params.uid,
      questionIndex: clampInt(params.questionIndex, 0, 10),
      question: clampStr(params.question, 1500, 'Interview question'),
      answer: clampStr(params.answer, 8000, 'Candidate answer'),
      score: clampInt(params.score, 0, 100),
      relevanceScore: clampInt(params.relevanceScore, 0, 100),
      clarityScore: clampInt(params.clarityScore, 0, 100),
      grammarScore: clampInt(params.grammarScore, 0, 100),
      structureScore: clampInt(params.structureScore, 0, 100),
      confidenceScore: clampInt(params.confidenceScore, 0, 100),
      strengths: clampStringList(params.strengths, 6, 300),
      improvements: clampStringList(params.improvements, 6, 300),
      correctedAnswer: clampStr(params.correctedAnswer, 4000, params.answer),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, turnPath);
  }

  const sessPath = `interviewSessions/${params.sessionId}`;
  try {
    if (params.isCompleted) {
      await updateDoc(doc(db, 'interviewSessions', params.sessionId), {
        status: 'completed',
        currentQuestionIndex: clampInt(params.questionIndex + 1, 0, 10),
        overallScore: clampInt(params.runningOverallScore, 0, 100),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'interviewSessions', params.sessionId), {
        currentQuestionIndex: clampInt(params.questionIndex + 1, 0, 10),
        currentQuestion: clampStr(
          params.nextQuestion,
          1500,
          'Could you share another concrete example?'
        ),
        overallScore: clampInt(params.runningOverallScore, 0, 100),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, sessPath);
  }
}

export function subscribeInterviewSessions(
  uid: string,
  onChange: (sessions: InterviewSession[]) => void
): Unsubscribe {
  const path = 'interviewSessions';
  const q = query(collection(db, 'interviewSessions'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: InterviewSession[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: d.userId,
            category: d.category as InterviewCategory,
            difficulty: d.difficulty as DifficultyLevel,
            status: d.status,
            totalQuestions: d.totalQuestions,
            currentQuestionIndex: d.currentQuestionIndex,
            currentQuestion: d.currentQuestion,
            overallScore: d.overallScore || 0,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
          };
        })
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      onChange(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function fetchInterviewTurns(
  uid: string,
  sessionId: string
): Promise<InterviewTurn[]> {
  const path = `interviewSessions/${sessionId}/turns`;
  try {
    const q = query(
      collection(db, 'interviewSessions', sessionId, 'turns'),
      where('userId', '==', uid)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          sessionId: d.sessionId,
          userId: d.userId,
          questionIndex: d.questionIndex,
          question: d.question,
          answer: d.answer,
          score: d.score,
          relevanceScore: d.relevanceScore,
          clarityScore: d.clarityScore,
          grammarScore: d.grammarScore,
          structureScore: d.structureScore,
          confidenceScore: d.confidenceScore,
          strengths: d.strengths || [],
          improvements: d.improvements || [],
          correctedAnswer: d.correctedAnswer,
          createdAt: toDate(d.createdAt),
        };
      })
      .sort((a, b) => a.questionIndex - b.questionIndex);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// ============================================================================
// 4. Structured Feedback Reports, Skill Scores, Streaks & Learning Activities
// ============================================================================
export async function saveFeedbackReportAndProgress(params: {
  uid: string;
  currentProfile: UserProfile | null;
  sourceType: 'coach' | 'interview' | 'scenario' | 'presentation';
  sourceSessionId: string;
  title: string;
  overallScore: number;
  clarityScore: number;
  grammarScore: number;
  structureScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  grammarCorrections: string[];
  vocabularySuggestions: string[];
  improvedVersion: string;
  recommendations: string[];
  suggestedNextExercise: string;
  durationMinutes: number;
  primarySkillKey: SkillKey;
}): Promise<FeedbackReport> {
  // 1. Save FeedbackReport
  const reportRef = doc(collection(db, 'feedbackReports'));
  const reportPath = `feedbackReports/${reportRef.id}`;
  const cleanReport = {
    userId: params.uid,
    sourceType: params.sourceType,
    sourceSessionId: clampStr(params.sourceSessionId, 128, reportRef.id),
    title: clampStr(params.title, 160, 'KAIZEN Feedback Report'),
    overallScore: clampInt(params.overallScore, 0, 100),
    clarityScore: clampInt(params.clarityScore, 0, 100),
    grammarScore: clampInt(params.grammarScore, 0, 100),
    structureScore: clampInt(params.structureScore, 0, 100),
    vocabularyScore: clampInt(params.vocabularyScore, 0, 100),
    confidenceScore: clampInt(params.confidenceScore, 0, 100),
    strengths: clampStringList(params.strengths, 8, 300),
    improvements: clampStringList(params.improvements, 8, 300),
    grammarCorrections: clampStringList(params.grammarCorrections, 8, 300),
    vocabularySuggestions: clampStringList(params.vocabularySuggestions, 8, 300),
    improvedVersion: clampStr(
      params.improvedVersion,
      6000,
      'Continue structuring your response with a clear headline, specific supporting example, and measurable result.'
    ),
    recommendations: clampStringList(params.recommendations, 8, 300),
    suggestedNextExercise: clampStr(
      params.suggestedNextExercise,
      400,
      'Practice a Behavioral Mock Interview to reinforce structured storytelling.'
    ),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(reportRef, cleanReport);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, reportPath);
  }

  // 2. Append LearningActivity
  const actRef = doc(collection(db, 'learningActivities'));
  const actPath = `learningActivities/${actRef.id}`;
  const todayKey = getTodayDateKey();
  try {
    await setDoc(actRef, {
      userId: params.uid,
      activityType: params.sourceType,
      title: cleanReport.title,
      score: cleanReport.overallScore,
      durationMinutes: clampInt(params.durationMinutes, 1, 240),
      dateKey: todayKey,
      sessionId: cleanReport.sourceSessionId,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, actPath);
  }

  // 3. Upsert relevant SkillScores (primary skill + english_fluency + communication)
  const skillsToUpdate: { key: SkillKey; score: number }[] = [
    { key: params.primarySkillKey, score: cleanReport.overallScore },
    {
      key: 'english_fluency',
      score: Math.round((cleanReport.grammarScore + cleanReport.vocabularyScore) / 2),
    },
    {
      key: 'communication',
      score: Math.round((cleanReport.clarityScore + cleanReport.structureScore) / 2),
    },
  ];

  const uniqueSkills = new Map<SkillKey, number>();
  for (const item of skillsToUpdate) {
    uniqueSkills.set(item.key, item.score);
  }

  for (const [skillKey, measuredScore] of uniqueSkills.entries()) {
    const scoreDocId = `${params.uid}_${skillKey}`;
    const scorePath = `skillScores/${scoreDocId}`;
    const def = SKILL_DEFINITIONS.find((s) => s.key === skillKey);
    const label = def?.label || skillKey;

    try {
      const scoreRef = doc(db, 'skillScores', scoreDocId);
      const snap = await getDoc(scoreRef);
      if (!snap.exists()) {
        await setDoc(scoreRef, {
          userId: params.uid,
          skillKey,
          skillLabel: clampStr(label, 80, 'Soft Skill'),
          score: clampInt(measuredScore, 0, 100),
          previousScore: 0,
          sessionsCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const prev = snap.data();
        const priorScore = Number(prev.score || 0);
        const priorCount = Number(prev.sessionsCount || 0);
        const blendedScore = Math.round(priorScore * 0.6 + measuredScore * 0.4);
        await updateDoc(scoreRef, {
          score: clampInt(blendedScore, 0, 100),
          previousScore: clampInt(priorScore, 0, 100),
          sessionsCount: clampInt(priorCount + 1, 0, 100000),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, scorePath);
    }
  }

  // 4. Update UserProfile streaks & aggregate readiness scores (Action 2)
  if (params.currentProfile) {
    const prof = params.currentProfile;
    const yesterdayKey = getYesterdayDateKey();
    let nextStreak = prof.currentStreak;
    if (prof.lastActiveDate === todayKey) {
      nextStreak = Math.max(1, prof.currentStreak);
    } else if (prof.lastActiveDate === yesterdayKey) {
      nextStreak = prof.currentStreak + 1;
    } else {
      nextStreak = 1;
    }
    const nextLongest = Math.max(prof.longestStreak, nextStreak);
    const nextTotalSessions = prof.totalSessions + 1;

    const nextCommScore =
      prof.communicationScore === 0
        ? cleanReport.overallScore
        : Math.round(prof.communicationScore * 0.65 + cleanReport.overallScore * 0.35);

    const nextInterviewScore =
      params.sourceType === 'interview'
        ? prof.interviewReadinessScore === 0
          ? cleanReport.overallScore
          : Math.round(prof.interviewReadinessScore * 0.6 + cleanReport.overallScore * 0.4)
        : prof.interviewReadinessScore === 0
        ? Math.round(cleanReport.overallScore * 0.9)
        : prof.interviewReadinessScore;

    const profilePath = `userProfiles/${params.uid}`;
    try {
      await updateDoc(doc(db, 'userProfiles', params.uid), {
        currentStreak: clampInt(nextStreak, 0, 10000),
        longestStreak: clampInt(nextLongest, 0, 10000),
        lastActiveDate: todayKey,
        totalSessions: clampInt(nextTotalSessions, 0, 100000),
        communicationScore: clampInt(nextCommScore, 0, 100),
        interviewReadinessScore: clampInt(nextInterviewScore, 0, 100),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, profilePath);
    }
  }

  return {
    id: reportRef.id,
    ...cleanReport,
    createdAt: new Date(),
  };
}

export function subscribeFeedbackReports(
  uid: string,
  onChange: (reports: FeedbackReport[]) => void
): Unsubscribe {
  const path = 'feedbackReports';
  const q = query(collection(db, 'feedbackReports'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: FeedbackReport[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: d.userId,
            sourceType: d.sourceType,
            sourceSessionId: d.sourceSessionId,
            title: d.title,
            overallScore: d.overallScore,
            clarityScore: d.clarityScore,
            grammarScore: d.grammarScore,
            structureScore: d.structureScore,
            vocabularyScore: d.vocabularyScore,
            confidenceScore: d.confidenceScore,
            strengths: d.strengths || [],
            improvements: d.improvements || [],
            grammarCorrections: d.grammarCorrections || [],
            vocabularySuggestions: d.vocabularySuggestions || [],
            improvedVersion: d.improvedVersion,
            recommendations: d.recommendations || [],
            suggestedNextExercise: d.suggestedNextExercise,
            createdAt: toDate(d.createdAt),
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onChange(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeSkillScores(
  uid: string,
  onChange: (scores: SkillScore[]) => void
): Unsubscribe {
  const path = 'skillScores';
  const q = query(collection(db, 'skillScores'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: SkillScore[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId,
          skillKey: d.skillKey as SkillKey,
          skillLabel: d.skillLabel,
          score: d.score,
          previousScore: d.previousScore || 0,
          sessionsCount: d.sessionsCount || 0,
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
        };
      });
      onChange(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeLearningActivities(
  uid: string,
  onChange: (activities: LearningActivity[]) => void
): Unsubscribe {
  const path = 'learningActivities';
  const q = query(collection(db, 'learningActivities'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: LearningActivity[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: d.userId,
            activityType: d.activityType,
            title: d.title,
            score: d.score,
            durationMinutes: d.durationMinutes,
            dateKey: d.dateKey,
            sessionId: d.sessionId,
            createdAt: toDate(d.createdAt),
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onChange(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

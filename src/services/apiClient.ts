import { auth } from '../lib/firebase.ts';
import type {
  CoachMessageEvaluation,
  DifficultyLevel,
  InterviewCategory,
} from '../types/kaizen.ts';

async function getBearerHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in to continue.');
  }
  const idToken = await currentUser.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed with status ${res.status}`
    );
  }
  return data as T;
}

export async function checkApiHealth(): Promise<{
  status: string;
  aiConfigured: boolean;
  setupNotice: string | null;
}> {
  const res = await fetch('/api/health');
  return handleApiResponse(res);
}

export async function sendCoachMessageApi(params: {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  difficulty: DifficultyLevel;
  focusGoal?: string;
  userName?: string;
}): Promise<CoachMessageEvaluation> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/chat/message', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse<CoachMessageEvaluation>(res);
}

export async function generateSessionReportApi(params: {
  sessionTitle: string;
  sourceType: 'coach' | 'scenario';
  difficulty: DifficultyLevel;
  history: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{
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
}> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/chat/report', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

export async function startMockInterviewApi(params: {
  category: InterviewCategory;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  targetRole?: string;
}): Promise<{
  openingIntro: string;
  firstQuestion: string;
  evaluationFocus: string[];
}> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/interviews/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

export async function submitInterviewAnswerApi(params: {
  category: InterviewCategory;
  difficulty: DifficultyLevel;
  questionIndex: number;
  totalQuestions: number;
  currentQuestion: string;
  answer: string;
  previousTurns: { question: string; answer: string; score: number }[];
}): Promise<{
  score: number;
  relevanceScore: number;
  clarityScore: number;
  grammarScore: number;
  structureScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  grammarCorrections: string[];
  vocabularySuggestions: string[];
  correctedAnswer: string;
  interviewerTransition: string;
  nextQuestion: string;
  actionableRecommendations: string[];
  isCompleted: boolean;
  suggestedNextExercise: string;
}> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/interviews/answer', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

export async function submitScenarioTurnApi(params: {
  scenarioId: string;
  difficulty: DifficultyLevel;
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  finalizeReport?: boolean;
}): Promise<CoachMessageEvaluation & { scenarioTitle: string; counterpartName: string }> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/practice/submit', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

export async function evaluatePresentationScriptApi(params: {
  topicTitle: string;
  audience: string;
  difficulty: DifficultyLevel;
  targetDurationMinutes: number;
  script: string;
}): Promise<{
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
  deliveryNotes?: string[];
  wordCount: number;
  estimatedMinutes: number;
  suggestedNextExercise: string;
}> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/presentations/evaluate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

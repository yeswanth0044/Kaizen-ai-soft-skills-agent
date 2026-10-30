export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type SessionType = 'coach' | 'scenario' | 'presentation';

export type SessionStatus = 'active' | 'completed';

export type InterviewCategory =
  | 'HR Interview'
  | 'Technical Interview'
  | 'Behavioral Interview'
  | 'Internship Interview'
  | 'Placement Interview'
  | 'Leadership Interview';

export type SkillKey =
  | 'communication'
  | 'interview'
  | 'english_fluency'
  | 'presentation'
  | 'leadership'
  | 'teamwork'
  | 'conflict_management'
  | 'problem_solving';

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  headline: string;
  learningGoal: string;
  dailyGoalMinutes: number;
  preferredDifficulty: DifficultyLevel;
  focusAreas: string[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalSessions: number;
  communicationScore: number;
  interviewReadinessScore: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PracticeSession {
  id: string;
  userId: string;
  sessionType: SessionType;
  title: string;
  scenarioId: string;
  difficulty: DifficultyLevel;
  status: SessionStatus;
  messageCount: number;
  latestScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  score: number;
  improvedResponse: string;
  grammarNotes: string[];
  clarityNote: string;
  createdAt: Date;
}

export interface InterviewSession {
  id: string;
  userId: string;
  category: InterviewCategory;
  difficulty: DifficultyLevel;
  status: SessionStatus;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentQuestion: string;
  overallScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewTurn {
  id: string;
  sessionId: string;
  userId: string;
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
  createdAt: Date;
}

export interface FeedbackReport {
  id: string;
  userId: string;
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
  createdAt: Date;
}

export interface SkillScore {
  id: string;
  userId: string;
  skillKey: SkillKey;
  skillLabel: string;
  score: number;
  previousScore: number;
  sessionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningActivity {
  id: string;
  userId: string;
  activityType: 'coach' | 'interview' | 'scenario' | 'presentation';
  title: string;
  score: number;
  durationMinutes: number;
  dateKey: string;
  sessionId: string;
  createdAt: Date;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  category: string;
  counterpartRole: string;
  counterpartName: string;
  difficulty: DifficultyLevel;
  targetSkill: SkillKey;
  situation: string;
  userObjective: string;
  openingLine: string;
  evaluationCriteria: string[];
}

export interface PresentationTopic {
  id: string;
  title: string;
  audience: string;
  recommendedDurationMinutes: number;
  difficulty: DifficultyLevel;
  context: string;
  keyPointsToCover: string[];
}

export interface CoachMessageEvaluation {
  mentorReply: string;
  followUpQuestion: string;
  score: number;
  clarityScore: number;
  grammarScore: number;
  structureScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  grammarNotes: string[];
  clarityNote: string;
  improvedResponse: string;
  strengths: string[];
  improvements: string[];
  vocabularySuggestions: string[];
  recommendations: string[];
  suggestedNextExercise: string;
}

export type AppSection =
  | 'dashboard'
  | 'coach'
  | 'interviews'
  | 'scenarios'
  | 'presentations'
  | 'progress'
  | 'profile';

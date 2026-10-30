import { z } from 'zod';

export const DifficultySchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);

export const InterviewCategorySchema = z.enum([
  'HR Interview',
  'Technical Interview',
  'Behavioral Interview',
  'Internship Interview',
  'Placement Interview',
  'Leadership Interview',
]);

export const HistoryTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

export const ChatMessageRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(6000),
  history: z.array(HistoryTurnSchema).max(20).default([]),
  difficulty: DifficultySchema.default('Intermediate'),
  focusGoal: z.string().max(300).optional(),
  userName: z.string().max(100).optional(),
});

export const SessionReportRequestSchema = z.object({
  sessionTitle: z.string().min(1).max(160),
  sourceType: z.enum(['coach', 'scenario']),
  difficulty: DifficultySchema.default('Intermediate'),
  history: z.array(HistoryTurnSchema).min(2).max(30),
});

export const InterviewStartRequestSchema = z.object({
  category: InterviewCategorySchema,
  difficulty: DifficultySchema,
  totalQuestions: z.number().int().min(3).max(8).default(4),
  targetRole: z.string().max(160).optional(),
});

export const InterviewAnswerRequestSchema = z.object({
  category: InterviewCategorySchema,
  difficulty: DifficultySchema,
  questionIndex: z.number().int().min(0).max(10),
  totalQuestions: z.number().int().min(3).max(8),
  currentQuestion: z.string().min(1).max(1500),
  answer: z.string().trim().min(2, 'Please write a complete answer').max(8000),
  previousTurns: z
    .array(
      z.object({
        question: z.string().max(1500),
        answer: z.string().max(8000),
        score: z.number().min(0).max(100),
      })
    )
    .max(10)
    .default([]),
});

export const PracticeStartRequestSchema = z.object({
  scenarioId: z.string().min(1).max(80),
  difficulty: DifficultySchema.optional(),
});

export const PracticeSubmitRequestSchema = z.object({
  scenarioId: z.string().min(1).max(80),
  difficulty: DifficultySchema.default('Intermediate'),
  message: z.string().trim().min(1).max(6000),
  history: z.array(HistoryTurnSchema).max(20).default([]),
  finalizeReport: z.boolean().default(false),
});

export const PresentationEvaluateRequestSchema = z.object({
  topicTitle: z.string().trim().min(2).max(160),
  audience: z.string().trim().min(2).max(200),
  difficulty: DifficultySchema.default('Intermediate'),
  targetDurationMinutes: z.number().min(1).max(20).default(3),
  script: z.string().trim().min(20, 'Presentation script must be at least 20 characters').max(8000),
});

// Structured AI Agent Validation Schemas
export const CoachEvaluationAIOutputSchema = z.object({
  mentorReply: z.string().min(1),
  followUpQuestion: z.string().min(1),
  clarityScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  structureScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  grammarNotes: z.array(z.string()).max(8).default([]),
  clarityNote: z.string().min(1),
  improvedResponse: z.string().min(1),
  strengths: z.array(z.string()).max(6).default([]),
  improvements: z.array(z.string()).max(6).default([]),
  vocabularySuggestions: z.array(z.string()).max(6).default([]),
  recommendations: z.array(z.string()).max(6).default([]),
});

export const InterviewQuestionAIOutputSchema = z.object({
  openingIntro: z.string().min(1),
  firstQuestion: z.string().min(1),
  evaluationFocus: z.array(z.string()).min(1).max(5),
});

export const InterviewTurnAIOutputSchema = z.object({
  relevanceScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  structureScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(1).max(6),
  improvements: z.array(z.string()).min(1).max(6),
  grammarCorrections: z.array(z.string()).max(6),
  vocabularySuggestions: z.array(z.string()).max(6),
  correctedAnswer: z.string().min(1),
  interviewerTransition: z.string().min(1),
  nextQuestion: z.string().default(''),
  actionableRecommendations: z.array(z.string()).max(6),
});

export const StructuredFeedbackAIOutputSchema = z.object({
  clarityScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  structureScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(1).max(8),
  improvements: z.array(z.string()).min(1).max(8),
  grammarCorrections: z.array(z.string()).max(8),
  vocabularySuggestions: z.array(z.string()).max(8),
  improvedVersion: z.string().min(1),
  recommendations: z.array(z.string()).min(1).max(8),
  deliveryNotes: z.array(z.string()).max(6).optional(),
});

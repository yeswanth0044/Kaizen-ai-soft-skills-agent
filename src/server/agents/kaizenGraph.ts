import { Type, ThinkingLevel } from '@google/genai';
import {
  generateStructuredJson,
  KAIZEN_DEEP_REPORT_MODEL,
  KAIZEN_FAST_CHAT_MODEL,
} from './geminiClient.ts';
import {
  CoachEvaluationAIOutputSchema,
  InterviewQuestionAIOutputSchema,
  InterviewTurnAIOutputSchema,
  StructuredFeedbackAIOutputSchema,
} from '../schemas/apiSchemas.ts';
import { COMMUNICATION_SCENARIOS } from '../../data/scenarios.ts';
import type { DifficultyLevel, InterviewCategory } from '../../types/kaizen.ts';

type NodeHandler<S> = (state: S) => Promise<Partial<S>> | Partial<S>;

class AgentStateGraph<S extends Record<string, any>> {
  private nodes = new Map<string, NodeHandler<S>>();
  private edges = new Map<string, string | ((state: S) => string)>();
  private entryPoint = '';

  addNode(name: string, handler: NodeHandler<S>): this {
    this.nodes.set(name, handler);
    return this;
  }

  setEntryPoint(name: string): this {
    this.entryPoint = name;
    return this;
  }

  addEdge(from: string, to: string | ((state: S) => string)): this {
    this.edges.set(from, to);
    return this;
  }

  async invoke(initialState: S): Promise<S> {
    let state: S = { ...initialState };
    let current = this.entryPoint;
    let steps = 0;

    while (current && current !== '__END__') {
      if (steps++ > 12) {
        throw new Error('Agent workflow exceeded maximum graph transitions.');
      }
      const handler = this.nodes.get(current);
      if (!handler) {
        throw new Error(`Missing agent graph node: ${current}`);
      }
      const patch = await handler(state);
      state = { ...state, ...patch };
      const next = this.edges.get(current);
      if (!next) break;
      current = typeof next === 'function' ? next(state) : next;
    }

    return state;
  }
}

const EVIDENCE_POLICY = `
CRITICAL EVALUATION RULES:
1. Evaluate ONLY written evidence present in the user's text (clarity, logical structure, grammar, vocabulary precision, concrete examples, and written confidence indicators such as active voice vs excessive hedging).
2. NEVER claim to hear or measure vocal tone, pronunciation, speaking speed, eye contact, or acoustic confidence from text input.
3. Score each criterion strictly on explicit evidence from 0 to 100.
`;

function computeWeightedScore(scores: {
  clarityScore: number;
  grammarScore: number;
  structureScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  relevanceScore?: number;
}): number {
  if (typeof scores.relevanceScore === 'number') {
    return Math.round(
      scores.relevanceScore * 0.25 +
        scores.clarityScore * 0.2 +
        scores.structureScore * 0.2 +
        scores.grammarScore * 0.15 +
        scores.vocabularyScore * 0.1 +
        scores.confidenceScore * 0.1
    );
  }
  return Math.round(
    scores.clarityScore * 0.25 +
      scores.structureScore * 0.25 +
      scores.grammarScore * 0.2 +
      scores.vocabularyScore * 0.15 +
      scores.confidenceScore * 0.15
  );
}

function selectRecommendedExercise(scores: {
  clarityScore: number;
  grammarScore: number;
  structureScore: number;
  vocabularyScore: number;
  confidenceScore: number;
}): string {
  const entries: [string, number][] = [
    ['clarity', scores.clarityScore],
    ['grammar', scores.grammarScore],
    ['structure', scores.structureScore],
    ['vocabulary', scores.vocabularyScore],
    ['confidence', scores.confidenceScore],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  const weakest = entries[0][0];

  switch (weakest) {
    case 'grammar':
      return 'Workplace Scenario: Asking Clarifying Questions Professionally — focus on clean, error-free sentence construction.';
    case 'structure':
      return 'Mock Interview: Behavioral Interview (Intermediate) — practice organizing answers using the Situation-Task-Action-Result (STAR) framework.';
    case 'vocabulary':
      return 'Presentation Practice: Proposing a Workflow Improvement to Leadership — upgrade casual phrasing into precise executive terminology.';
    case 'confidence':
      return 'Workplace Scenario: Communicating a Timeline Risk to Your Manager — replace hesitant qualifiers with direct ownership phrasing.';
    default:
      return 'Workplace Scenario: Explaining Complex Technical Ideas Clearly — practice headline-first explanations without unnecessary filler.';
  }
}

// ============================================================================
// 1. AI Soft Skills Coach StateGraph Workflow (Low-Latency Interactive Mode)
// ============================================================================
interface CoachGraphState {
  userName: string;
  difficulty: DifficultyLevel;
  focusGoal: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  formattedTranscript: string;
  scenarioDirective: string;
  aiEvaluation?: ReturnType<typeof CoachEvaluationAIOutputSchema.parse>;
  overallScore: number;
  suggestedNextExercise: string;
}

export async function runCoachAgentWorkflow(input: {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  difficulty: DifficultyLevel;
  focusGoal?: string;
  userName?: string;
}) {
  const graph = new AgentStateGraph<CoachGraphState>()
    .addNode('conversationManager', (state) => {
      const recent = state.history.slice(-10);
      const formattedTranscript =
        recent.length === 0
          ? '(Start of conversation)'
          : recent
              .map((m) => `${m.role === 'user' ? 'Learner' : 'KAIZEN Mentor'}: ${m.content}`)
              .join('\n\n');
      return { formattedTranscript };
    })
    .addNode('scenarioManager', (state) => {
      const scenarioDirective = `Learner: ${state.userName || 'Learner'} | Difficulty: ${state.difficulty} | Goal: ${
        state.focusGoal || 'Articulate workplace communication and interview readiness.'
      }`;
      return { scenarioDirective };
    })
    .addNode('evaluationAndFeedbackAgent', async (state) => {
      const aiEvaluation = await generateStructuredJson({
        model: KAIZEN_FAST_CHAT_MODEL,
        thinkingLevel: ThinkingLevel.MINIMAL,
        systemInstruction: `You are KAIZEN, a warm, perceptive executive communication mentor.
${EVIDENCE_POLICY}
Keep responses crisp and conversational:
1. mentorReply: 1 to 2 concise paragraphs directly coaching or responding to the learner.
2. followUpQuestion: 1 clear, natural follow-up question.
3. grammarNotes: Up to 3 brief grammar/mechanics fixes (empty array if clean).
4. clarityNote: 1 concise sentence on written clarity and confidence phrasing.
5. improvedResponse: A tightened, natural exemplar rewrite of the learner's message.`,
        prompt: `${state.scenarioDirective}

RECENT CONTEXT:
${state.formattedTranscript}

LEARNER MESSAGE:
"${state.userMessage}"`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mentorReply: { type: Type.STRING },
            followUpQuestion: { type: Type.STRING },
            clarityScore: { type: Type.INTEGER },
            grammarScore: { type: Type.INTEGER },
            structureScore: { type: Type.INTEGER },
            vocabularyScore: { type: Type.INTEGER },
            confidenceScore: { type: Type.INTEGER },
            grammarNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            clarityNote: { type: Type.STRING },
            improvedResponse: { type: Type.STRING },
          },
          required: [
            'mentorReply',
            'followUpQuestion',
            'clarityScore',
            'grammarScore',
            'structureScore',
            'vocabularyScore',
            'confidenceScore',
            'grammarNotes',
            'clarityNote',
            'improvedResponse',
          ],
        },
        parse: (raw) => CoachEvaluationAIOutputSchema.parse(raw),
      });

      const overallScore = computeWeightedScore(aiEvaluation);
      return { aiEvaluation, overallScore };
    })
    .addNode('recommendationAgent', (state) => {
      if (!state.aiEvaluation) return {};
      return {
        suggestedNextExercise: selectRecommendedExercise(state.aiEvaluation),
      };
    })
    .setEntryPoint('conversationManager')
    .addEdge('conversationManager', 'scenarioManager')
    .addEdge('scenarioManager', 'evaluationAndFeedbackAgent')
    .addEdge('evaluationAndFeedbackAgent', 'recommendationAgent')
    .addEdge('recommendationAgent', '__END__');

  const finalState = await graph.invoke({
    userName: input.userName || 'Learner',
    difficulty: input.difficulty,
    focusGoal: input.focusGoal || '',
    history: input.history,
    userMessage: input.message,
    formattedTranscript: '',
    scenarioDirective: '',
    overallScore: 0,
    suggestedNextExercise: '',
  });

  const ev = finalState.aiEvaluation!;
  return {
    ...ev,
    score: finalState.overallScore,
    suggestedNextExercise: finalState.suggestedNextExercise,
  };
}

// ============================================================================
// 2. Mock Interview Agent Workflow
// ============================================================================
export async function startMockInterviewWorkflow(input: {
  category: InterviewCategory;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  targetRole?: string;
}) {
  return generateStructuredJson({
    model: KAIZEN_FAST_CHAT_MODEL,
    thinkingLevel: ThinkingLevel.MINIMAL,
    systemInstruction: `You are an experienced hiring panelist conducting a realistic ${input.category} at ${input.difficulty} difficulty.
Generate a brief, realistic welcome introduction (1-2 sentences) and ask Question 1 of ${input.totalQuestions}.
Ask ONLY ONE clear, realistic interview question tailored to ${input.category} (${input.difficulty} level).`,
    prompt: `Interview Track: ${input.category}
Difficulty: ${input.difficulty}
Target Candidate Focus: ${input.targetRole || 'Early-career professional / University graduate'}
Total Planned Questions: ${input.totalQuestions}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        openingIntro: { type: Type.STRING },
        firstQuestion: { type: Type.STRING },
        evaluationFocus: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['openingIntro', 'firstQuestion', 'evaluationFocus'],
    },
    parse: (raw) => InterviewQuestionAIOutputSchema.parse(raw),
  });
}

export async function evaluateInterviewTurnWorkflow(input: {
  category: InterviewCategory;
  difficulty: DifficultyLevel;
  questionIndex: number;
  totalQuestions: number;
  currentQuestion: string;
  answer: string;
  previousTurns: { question: string; answer: string; score: number }[];
}) {
  const isFinalQuestion = input.questionIndex + 1 >= input.totalQuestions;

  const priorSummary =
    input.previousTurns.length === 0
      ? 'None yet (this is Question 1).'
      : input.previousTurns
          .map(
            (t, idx) =>
              `Q${idx + 1}: ${t.question}\nCandidate Answer: ${t.answer}\nScore: ${t.score}/100`
          )
          .join('\n\n');

  const evaluated = await generateStructuredJson({
    model: isFinalQuestion ? KAIZEN_DEEP_REPORT_MODEL : KAIZEN_FAST_CHAT_MODEL,
    thinkingLevel: isFinalQuestion ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
    systemInstruction: `You are KAIZEN's Interview Evaluation & Panelist Agent conducting a ${input.category} (${input.difficulty} difficulty).
${EVIDENCE_POLICY}
Evaluate the candidate's written answer concisely across relevance, clarity, grammar, STAR structure, vocabulary, and written confidence phrasing.
${
  isFinalQuestion
    ? 'This was the FINAL question of the interview. Leave nextQuestion as "" and write a warm concluding remark in interviewerTransition.'
    : `Generate Question ${input.questionIndex + 2} of ${input.totalQuestions} in nextQuestion exploring a distinct competency for ${input.category}.`
}`,
    prompt: `PRIOR TURNS:
${priorSummary}

CURRENT QUESTION (${input.questionIndex + 1}/${input.totalQuestions}):
"${input.currentQuestion}"

CANDIDATE ANSWER:
"${input.answer}"`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        relevanceScore: { type: Type.INTEGER },
        clarityScore: { type: Type.INTEGER },
        grammarScore: { type: Type.INTEGER },
        structureScore: { type: Type.INTEGER },
        vocabularyScore: { type: Type.INTEGER },
        confidenceScore: { type: Type.INTEGER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        grammarCorrections: { type: Type.ARRAY, items: { type: Type.STRING } },
        vocabularySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctedAnswer: { type: Type.STRING },
        interviewerTransition: { type: Type.STRING },
        nextQuestion: { type: Type.STRING },
        actionableRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'relevanceScore',
        'clarityScore',
        'grammarScore',
        'structureScore',
        'vocabularyScore',
        'confidenceScore',
        'strengths',
        'improvements',
        'grammarCorrections',
        'vocabularySuggestions',
        'correctedAnswer',
        'interviewerTransition',
        'nextQuestion',
        'actionableRecommendations',
      ],
    },
    parse: (raw) => InterviewTurnAIOutputSchema.parse(raw),
  });

  const turnScore = computeWeightedScore(evaluated);
  const suggestedNextExercise = selectRecommendedExercise(evaluated);

  return {
    ...evaluated,
    score: turnScore,
    isCompleted: isFinalQuestion,
    suggestedNextExercise,
  };
}

// ============================================================================
// 3. Workplace Communication Scenario Role-Play Workflow (Low-Latency Mode)
// ============================================================================
export async function runScenarioTurnWorkflow(input: {
  scenarioId: string;
  difficulty: DifficultyLevel;
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  finalizeReport: boolean;
}) {
  const scenario =
    COMMUNICATION_SCENARIOS.find((s) => s.id === input.scenarioId) || COMMUNICATION_SCENARIOS[0];

  const transcript = input.history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'Learner' : scenario.counterpartName}: ${m.content}`)
    .join('\n\n');

  const evaluated = await generateStructuredJson({
    model: KAIZEN_FAST_CHAT_MODEL,
    thinkingLevel: ThinkingLevel.MINIMAL,
    systemInstruction: `You are role-playing as ${scenario.counterpartName} (${scenario.counterpartRole}) in a workplace communication exercise at ${input.difficulty} difficulty.
Context: ${scenario.situation}
Learner Objective: ${scenario.userObjective}
Criteria: ${scenario.evaluationCriteria.join(' | ')}
${EVIDENCE_POLICY}

In mentorReply, stay 100% in character as ${scenario.counterpartName} (1-2 concise paragraphs).
In followUpQuestion, ask a natural in-character follow-up prompt.
Simultaneously evaluate the learner's phrasing concisely.`,
    prompt: `CONVERSATION SO FAR:
${transcript || `${scenario.counterpartName}: ${scenario.openingLine}`}

LEARNER'S LATEST RESPONSE:
"${input.message}"`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        mentorReply: { type: Type.STRING },
        followUpQuestion: { type: Type.STRING },
        clarityScore: { type: Type.INTEGER },
        grammarScore: { type: Type.INTEGER },
        structureScore: { type: Type.INTEGER },
        vocabularyScore: { type: Type.INTEGER },
        confidenceScore: { type: Type.INTEGER },
        grammarNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
        clarityNote: { type: Type.STRING },
        improvedResponse: { type: Type.STRING },
      },
      required: [
        'mentorReply',
        'followUpQuestion',
        'clarityScore',
        'grammarScore',
        'structureScore',
        'vocabularyScore',
        'confidenceScore',
        'grammarNotes',
        'clarityNote',
        'improvedResponse',
      ],
    },
    parse: (raw) => CoachEvaluationAIOutputSchema.parse(raw),
  });

  const overallScore = computeWeightedScore(evaluated);
  const suggestedNextExercise = selectRecommendedExercise(evaluated);

  return {
    ...evaluated,
    score: overallScore,
    scenarioTitle: scenario.title,
    counterpartName: scenario.counterpartName,
    suggestedNextExercise,
  };
}

// ============================================================================
// 4. Presentation Script Evaluation & End-of-Session Deep Reports (gemini-3.8-flash)
// ============================================================================
export async function evaluatePresentationWorkflow(input: {
  topicTitle: string;
  audience: string;
  difficulty: DifficultyLevel;
  targetDurationMinutes: number;
  script: string;
}) {
  const wordCount = input.script.trim().split(/\s+/).length;
  const estimatedMinutes = Math.max(0.5, Number((wordCount / 130).toFixed(1)));

  const report = await generateStructuredJson({
    model: KAIZEN_DEEP_REPORT_MODEL,
    thinkingLevel: ThinkingLevel.LOW,
    systemInstruction: `You are KAIZEN's Executive Presentation Coach evaluating a written presentation script.
${EVIDENCE_POLICY}
Frame delivery suggestions strictly around structural signposting, sentence length for breath pacing, transition phrases, rhetorical hooks, and emphasis cues—never claim to have heard an audio recording.
Rewrite a complete, presentation-ready exemplar version of their script in improvedVersion.`,
    prompt: `Presentation Topic: ${input.topicTitle}
Target Audience: ${input.audience}
Difficulty Standard: ${input.difficulty}
Target Duration: ${input.targetDurationMinutes} minutes (approx. ${input.targetDurationMinutes * 130} words)
Submitted Word Count: ${wordCount} words (~${estimatedMinutes} minutes at 130 wpm)

SUBMITTED PRESENTATION SCRIPT:
"""
${input.script}
"""`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        clarityScore: { type: Type.INTEGER },
        grammarScore: { type: Type.INTEGER },
        structureScore: { type: Type.INTEGER },
        vocabularyScore: { type: Type.INTEGER },
        confidenceScore: { type: Type.INTEGER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        grammarCorrections: { type: Type.ARRAY, items: { type: Type.STRING } },
        vocabularySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvedVersion: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        deliveryNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'clarityScore',
        'grammarScore',
        'structureScore',
        'vocabularyScore',
        'confidenceScore',
        'strengths',
        'improvements',
        'grammarCorrections',
        'vocabularySuggestions',
        'improvedVersion',
        'recommendations',
      ],
    },
    parse: (raw) => StructuredFeedbackAIOutputSchema.parse(raw),
  });

  const overallScore = computeWeightedScore(report);
  const suggestedNextExercise = selectRecommendedExercise(report);

  return {
    ...report,
    overallScore,
    wordCount,
    estimatedMinutes,
    suggestedNextExercise,
  };
}

export async function generateSessionFeedbackReportWorkflow(input: {
  sessionTitle: string;
  sourceType: 'coach' | 'scenario';
  difficulty: DifficultyLevel;
  history: { role: 'user' | 'assistant'; content: string }[];
}) {
  const transcript = input.history
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Coach/Counterpart'}: ${m.content}`)
    .join('\n\n');

  const report = await generateStructuredJson({
    model: KAIZEN_DEEP_REPORT_MODEL,
    thinkingLevel: ThinkingLevel.LOW,
    systemInstruction: `You are KAIZEN's Senior Assessment Architect generating an end-of-session 8-part Structured Feedback Report across a learner's conversation transcript.
${EVIDENCE_POLICY}
In improvedVersion, rewrite the learner's single most important or weakest response from the session into a polished, high-impact professional response.`,
    prompt: `Session Title: ${input.sessionTitle}
Module Type: ${input.sourceType}
Difficulty: ${input.difficulty}

FULL SESSION TRANSCRIPT:
${transcript}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        clarityScore: { type: Type.INTEGER },
        grammarScore: { type: Type.INTEGER },
        structureScore: { type: Type.INTEGER },
        vocabularyScore: { type: Type.INTEGER },
        confidenceScore: { type: Type.INTEGER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        grammarCorrections: { type: Type.ARRAY, items: { type: Type.STRING } },
        vocabularySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvedVersion: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'clarityScore',
        'grammarScore',
        'structureScore',
        'vocabularyScore',
        'confidenceScore',
        'strengths',
        'improvements',
        'grammarCorrections',
        'vocabularySuggestions',
        'improvedVersion',
        'recommendations',
      ],
    },
    parse: (raw) => StructuredFeedbackAIOutputSchema.parse(raw),
  });

  const overallScore = computeWeightedScore(report);
  const suggestedNextExercise = selectRecommendedExercise(report);

  return {
    ...report,
    overallScore,
    suggestedNextExercise,
  };
}

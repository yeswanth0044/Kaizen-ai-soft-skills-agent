import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { INTERVIEW_CATEGORIES } from '../data/scenarios.ts';
import {
  startMockInterviewApi,
  submitInterviewAnswerApi,
} from '../services/apiClient.ts';
import {
  createInterviewSessionRecord,
  fetchInterviewTurns,
  recordInterviewTurnAndAdvance,
  saveFeedbackReportAndProgress,
  subscribeInterviewSessions,
} from '../services/firestoreService.ts';
import { FeedbackReportModal } from './FeedbackReportModal.tsx';
import type {
  AppSection,
  DifficultyLevel,
  FeedbackReport,
  InterviewCategory,
  InterviewSession,
  InterviewTurn,
} from '../types/kaizen.ts';

interface MockInterviewViewProps {
  reports: FeedbackReport[];
  onNavigate: (section: AppSection) => void;
}

const DIFFICULTIES: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export function MockInterviewView({ reports, onNavigate }: MockInterviewViewProps) {
  const { user, profile } = useAuth();
  const [selectedCategory, setSelectedCategory] =
    useState<InterviewCategory>('Behavioral Interview');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(
    profile?.preferredDifficulty || 'Intermediate'
  );
  const [questionCount, setQuestionCount] = useState<number>(4);

  const [pastSessions, setPastSessions] = useState<InterviewSession[]>([]);
  const [activeInterview, setActiveInterview] = useState<InterviewSession | null>(null);
  const [openingIntro, setOpeningIntro] = useState<string>('');
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [answerDraft, setAnswerDraft] = useState('');
  const [loadingStart, setLoadingStart] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestTurnFeedback, setLatestTurnFeedback] = useState<{
    question: string;
    score: number;
    strengths: string[];
    improvements: string[];
    correctedAnswer: string;
    transition: string;
  } | null>(null);

  const [modalReport, setModalReport] = useState<FeedbackReport | null>(null);
  const [inspectingHistorySession, setInspectingHistorySession] =
    useState<InterviewSession | null>(null);
  const [inspectingHistoryTurns, setInspectingHistoryTurns] = useState<InterviewTurn[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeInterviewSessions(user.uid, (loaded) => {
      setPastSessions(loaded);
      if (activeInterview) {
        const updated = loaded.find((s) => s.id === activeInterview.id);
        if (updated) setActiveInterview(updated);
      }
    });
    return () => unsub();
  }, [user, activeInterview?.id]);

  const handleStartInterview = async () => {
    if (!user || loadingStart) return;
    setErrorMessage(null);
    setLoadingStart(true);
    setLatestTurnFeedback(null);
    setInspectingHistorySession(null);

    try {
      const started = await startMockInterviewApi({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        totalQuestions: questionCount,
        targetRole: profile?.headline,
      });

      const created = await createInterviewSessionRecord({
        uid: user.uid,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        totalQuestions: questionCount,
        firstQuestion: started.firstQuestion,
      });

      setOpeningIntro(started.openingIntro);
      setTurns([]);
      setAnswerDraft('');
      setActiveInterview(created);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start mock interview.');
    } finally {
      setLoadingStart(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeInterview || submittingAnswer) return;
    const trimmed = answerDraft.trim();
    if (trimmed.length < 10) {
      setErrorMessage('Please write a complete interview answer (at least 10 characters).');
      return;
    }

    setErrorMessage(null);
    setSubmittingAnswer(true);

    try {
      const evalResult = await submitInterviewAnswerApi({
        category: activeInterview.category,
        difficulty: activeInterview.difficulty,
        questionIndex: activeInterview.currentQuestionIndex,
        totalQuestions: activeInterview.totalQuestions,
        currentQuestion: activeInterview.currentQuestion,
        answer: trimmed,
        previousTurns: turns.map((t) => ({
          question: t.question,
          answer: t.answer,
          score: t.score,
        })),
      });

      const newTurnLocal: InterviewTurn = {
        id: `local_${Date.now()}`,
        sessionId: activeInterview.id,
        userId: user.uid,
        questionIndex: activeInterview.currentQuestionIndex,
        question: activeInterview.currentQuestion,
        answer: trimmed,
        score: evalResult.score,
        relevanceScore: evalResult.relevanceScore,
        clarityScore: evalResult.clarityScore,
        grammarScore: evalResult.grammarScore,
        structureScore: evalResult.structureScore,
        confidenceScore: evalResult.confidenceScore,
        strengths: evalResult.strengths,
        improvements: evalResult.improvements,
        correctedAnswer: evalResult.correctedAnswer,
        createdAt: new Date(),
      };

      const nextTurns = [...turns, newTurnLocal];
      const avgScore = Math.round(
        nextTurns.reduce((sum, t) => sum + t.score, 0) / nextTurns.length
      );

      await recordInterviewTurnAndAdvance({
        uid: user.uid,
        sessionId: activeInterview.id,
        questionIndex: activeInterview.currentQuestionIndex,
        question: activeInterview.currentQuestion,
        answer: trimmed,
        score: evalResult.score,
        relevanceScore: evalResult.relevanceScore,
        clarityScore: evalResult.clarityScore,
        grammarScore: evalResult.grammarScore,
        structureScore: evalResult.structureScore,
        confidenceScore: evalResult.confidenceScore,
        strengths: evalResult.strengths,
        improvements: evalResult.improvements,
        correctedAnswer: evalResult.correctedAnswer,
        isCompleted: evalResult.isCompleted,
        nextQuestion: evalResult.nextQuestion,
        runningOverallScore: avgScore,
      });

      setTurns(nextTurns);
      setAnswerDraft('');
      setLatestTurnFeedback({
        question: activeInterview.currentQuestion,
        score: evalResult.score,
        strengths: evalResult.strengths,
        improvements: evalResult.improvements,
        correctedAnswer: evalResult.correctedAnswer,
        transition: evalResult.interviewerTransition,
      });

      if (evalResult.isCompleted) {
        const avgClarity = Math.round(
          nextTurns.reduce((s, t) => s + t.clarityScore, 0) / nextTurns.length
        );
        const avgGrammar = Math.round(
          nextTurns.reduce((s, t) => s + t.grammarScore, 0) / nextTurns.length
        );
        const avgStructure = Math.round(
          nextTurns.reduce((s, t) => s + t.structureScore, 0) / nextTurns.length
        );
        const avgConfidence = Math.round(
          nextTurns.reduce((s, t) => s + t.confidenceScore, 0) / nextTurns.length
        );

        const report = await saveFeedbackReportAndProgress({
          uid: user.uid,
          currentProfile: profile,
          sourceType: 'interview',
          sourceSessionId: activeInterview.id,
          title: `${activeInterview.category} (${activeInterview.difficulty})`,
          overallScore: avgScore,
          clarityScore: avgClarity,
          grammarScore: avgGrammar,
          structureScore: avgStructure,
          vocabularyScore: evalResult.vocabularyScore,
          confidenceScore: avgConfidence,
          strengths: Array.from(new Set(nextTurns.flatMap((t) => t.strengths))).slice(0, 6),
          improvements: Array.from(new Set(nextTurns.flatMap((t) => t.improvements))).slice(0, 6),
          grammarCorrections: evalResult.grammarCorrections,
          vocabularySuggestions: evalResult.vocabularySuggestions,
          improvedVersion: evalResult.correctedAnswer,
          recommendations:
            evalResult.actionableRecommendations.length > 0
              ? evalResult.actionableRecommendations
              : ['Structure future interview answers with Situation, Task, Action, and quantified Result.'],
          suggestedNextExercise: evalResult.suggestedNextExercise,
          durationMinutes: nextTurns.length * 4,
          primarySkillKey:
            activeInterview.category === 'Leadership Interview' ? 'leadership' : 'interview',
        });

        setActiveInterview(null);
        setModalReport(report);
      } else {
        setActiveInterview({
          ...activeInterview,
          currentQuestionIndex: activeInterview.currentQuestionIndex + 1,
          currentQuestion: evalResult.nextQuestion,
          overallScore: avgScore,
        });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to evaluate interview answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleInspectPastSession = async (sess: InterviewSession) => {
    if (!user) return;
    if (sess.status === 'active') {
      const existingTurns = await fetchInterviewTurns(user.uid, sess.id);
      setTurns(existingTurns);
      setActiveInterview(sess);
      setInspectingHistorySession(null);
      return;
    }

    const existingReport = reports.find((r) => r.sourceSessionId === sess.id);
    if (existingReport) {
      setModalReport(existingReport);
    } else {
      const loadedTurns = await fetchInterviewTurns(user.uid, sess.id);
      setInspectingHistorySession(sess);
      setInspectingHistoryTurns(loadedTurns);
    }
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Interview Stage */}
      {activeInterview && activeInterview.status === 'active' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>{activeInterview.category}</span>
                <span aria-hidden="true">·</span>
                <span>{activeInterview.difficulty} Difficulty</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-semibold text-indigo-600">
                  Question {activeInterview.currentQuestionIndex + 1} of{' '}
                  {activeInterview.totalQuestions}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Live Mock Interview Session
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveInterview(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap"
            >
              Pause &amp; Exit to Tracks
            </button>
          </div>

          <div className="p-6 space-y-6">
            {openingIntro && activeInterview.currentQuestionIndex === 0 && (
              <div className="text-sm text-slate-600 pb-4 border-b border-slate-100">
                {openingIntro}
              </div>
            )}

            {/* Previous Turn Instant Evaluation */}
            {latestTurnFeedback && (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Previous Answer Evaluated</span>
                  </div>
                  <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                    Turn Score: {latestTurnFeedback.score}/100
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {latestTurnFeedback.transition}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">Key Strength: </span>
                    <span className="text-slate-600">
                      {latestTurnFeedback.strengths[0] || 'Relevant response'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Priority Refinement: </span>
                    <span className="text-slate-600">
                      {latestTurnFeedback.improvements[0] || 'Add concrete metrics'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Current Active Question */}
            <div>
              <div className="text-xs font-semibold text-indigo-600 mb-2">
                Interviewer Prompt ({activeInterview.currentQuestionIndex + 1}/
                {activeInterview.totalQuestions})
              </div>
              <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
                &ldquo;{activeInterview.currentQuestion}&rdquo;
              </p>
            </div>

            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <label htmlFor="interview-answer" className="font-medium text-slate-700">
                    Your Response
                  </label>
                  <span className="font-mono tabular-nums">
                    {answerDraft.trim() ? answerDraft.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <textarea
                  id="interview-answer"
                  rows={6}
                  maxLength={6000}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder="Structure your answer clearly: state the context, the specific action you owned, and the measurable outcome..."
                  className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Evaluated on Relevance, Clarity, Grammar, STAR Structure &amp; Written Confidence.
                </p>
                <button
                  type="submit"
                  disabled={submittingAnswer || answerDraft.trim().length < 5}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {submittingAnswer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating Answer...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {activeInterview.currentQuestionIndex + 1 >= activeInterview.totalQuestions
                          ? 'Submit Final Answer & View Report'
                          : 'Submit & Next Question'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Setup Configuration Panel */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                AI Mock Interview Simulator
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Select an interview category and difficulty tier. Answer one realistic question at a
                time and receive a full performance report at the end.
              </p>
            </div>

            {/* Difficulty & Length Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      selectedDifficulty === diff
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {[3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      questionCount === cnt
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6 Interview Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERVIEW_CATEGORIES.map((item) => {
              const active = selectedCategory === item.category;
              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => setSelectedCategory(item.category)}
                  className={`p-5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs text-slate-500">{item.typicalRoles}</div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{item.category}</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.focus}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    {item.sampleCriteria.join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              <span>Selected: {selectedCategory}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{selectedDifficulty}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{questionCount} questions</span>
            </div>

            <button
              type="button"
              disabled={loadingStart}
              onClick={handleStartInterview}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {loadingStart ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Interviewer...</span>
                </>
              ) : (
                <>
                  <span>Start {selectedCategory}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Inspecting Fallback Turns Drawer */}
      {inspectingHistorySession && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {inspectingHistorySession.category} Transcript
            </h3>
            <button
              type="button"
              onClick={() => setInspectingHistorySession(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {inspectingHistoryTurns.map((t) => (
              <div key={t.id} className="py-4 space-y-2 text-sm">
                <div className="font-semibold text-slate-900">
                  Q{t.questionIndex + 1}: {t.question}
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{t.answer}</p>
                <div className="text-xs text-indigo-700">
                  Model Upgrade: {t.correctedAnswer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview History */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Mock Interview History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Resume an active interview or inspect your completed performance reports
          </p>
        </div>

        {pastSessions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No mock interviews started yet. Choose a category above to begin your first simulation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Progress</th>
                  <th className="py-3 px-6 text-right">Score</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pastSessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-900">{sess.category}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{sess.difficulty}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 capitalize">{sess.status}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 text-right font-mono tabular-nums">
                      {sess.currentQuestionIndex}/{sess.totalQuestions}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {sess.overallScore > 0 ? `${sess.overallScore}/100` : '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => void handleInspectPastSession(sess)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                      >
                        {sess.status === 'active' ? 'Resume' : 'View Report'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FeedbackReportModal
        report={modalReport}
        onClose={() => setModalReport(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

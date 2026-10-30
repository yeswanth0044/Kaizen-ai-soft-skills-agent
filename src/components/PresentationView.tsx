import React, { useState } from 'react';
import { Loader2, AlertCircle, FileCheck2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { PRESENTATION_TOPICS } from '../data/scenarios.ts';
import { evaluatePresentationScriptApi } from '../services/apiClient.ts';
import {
  completePracticeSession,
  createPracticeSession,
  saveFeedbackReportAndProgress,
} from '../services/firestoreService.ts';
import { FeedbackReportModal } from './FeedbackReportModal.tsx';
import type {
  AppSection,
  DifficultyLevel,
  FeedbackReport,
} from '../types/kaizen.ts';

interface PresentationViewProps {
  onNavigate: (section: AppSection) => void;
}

export function PresentationView({ onNavigate }: PresentationViewProps) {
  const { user, profile } = useAuth();
  const [selectedTopicId, setSelectedTopicId] = useState<string>(PRESENTATION_TOPICS[0].id);
  const [customTitle, setCustomTitle] = useState('');
  const [customAudience, setCustomAudience] = useState('Hiring managers and senior peers');
  const [customDuration, setCustomDuration] = useState(3);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    profile?.preferredDifficulty || 'Intermediate'
  );
  const [script, setScript] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<{
    report: FeedbackReport;
    originalScript: string;
    deliveryNotes: string[];
    wordCount: number;
    estimatedMinutes: number;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isCustom = selectedTopicId === 'custom';
  const activeTopic = PRESENTATION_TOPICS.find((t) => t.id === selectedTopicId);

  const effectiveTitle = isCustom
    ? customTitle.trim() || 'Custom Professional Presentation'
    : activeTopic?.title || 'Presentation Practice';
  const effectiveAudience = isCustom
    ? customAudience.trim() || 'Executive stakeholders'
    : activeTopic?.audience || 'Stakeholders';
  const effectiveDuration = isCustom
    ? customDuration
    : activeTopic?.recommendedDurationMinutes || 3;

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const estMinutes = wordCount > 0 ? (wordCount / 130).toFixed(1) : '0.0';

  const handleEvaluatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || evaluating) return;
    if (script.trim().length < 30) {
      setErrorMessage(
        'Please write at least 30 characters of your presentation script before submitting for evaluation.'
      );
      return;
    }

    setErrorMessage(null);
    setEvaluating(true);

    try {
      const evaluation = await evaluatePresentationScriptApi({
        topicTitle: effectiveTitle,
        audience: effectiveAudience,
        difficulty,
        targetDurationMinutes: effectiveDuration,
        script: script.trim(),
      });

      const sess = await createPracticeSession({
        uid: user.uid,
        sessionType: 'presentation',
        title: effectiveTitle,
        scenarioId: selectedTopicId,
        difficulty,
      });

      await completePracticeSession({
        sessionId: sess.id,
        messageCount: 1,
        latestScore: evaluation.overallScore,
      });

      const savedReport = await saveFeedbackReportAndProgress({
        uid: user.uid,
        currentProfile: profile,
        sourceType: 'presentation',
        sourceSessionId: sess.id,
        title: `Presentation: ${effectiveTitle}`,
        overallScore: evaluation.overallScore,
        clarityScore: evaluation.clarityScore,
        grammarScore: evaluation.grammarScore,
        structureScore: evaluation.structureScore,
        vocabularyScore: evaluation.vocabularyScore,
        confidenceScore: evaluation.confidenceScore,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        grammarCorrections: evaluation.grammarCorrections,
        vocabularySuggestions: evaluation.vocabularySuggestions,
        improvedVersion: evaluation.improvedVersion,
        recommendations: evaluation.recommendations,
        suggestedNextExercise: evaluation.suggestedNextExercise,
        durationMinutes: Math.max(5, Math.ceil(evaluation.estimatedMinutes * 2)),
        primarySkillKey: 'presentation',
      });

      setLastEvaluation({
        report: savedReport,
        originalScript: script.trim(),
        deliveryNotes: evaluation.deliveryNotes || [],
        wordCount: evaluation.wordCount,
        estimatedMinutes: evaluation.estimatedMinutes,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to evaluate presentation script.'
      );
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Difficulty Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Presentation &amp; Pitch Studio
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Select a presentation brief, draft your spoken script, and receive feedback on
            structure, clarity, vocabulary, written pacing cues, and a full sample improved script.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {(['Beginner', 'Intermediate', 'Advanced'] as DifficultyLevel[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setDifficulty(tier)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                difficulty === tier
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Selector + Script Drafting Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">1. Choose Presentation Topic</h2>
          <div className="space-y-2">
            {PRESENTATION_TOPICS.map((topic) => {
              const selected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    Target: {topic.recommendedDurationMinutes} min · {topic.difficulty}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">{topic.title}</div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedTopicId('custom')}
              className={`w-full p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                isCustom
                  ? 'border-indigo-600 bg-indigo-50/40'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-slate-500">Flexible Brief</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                Custom Presentation Topic
              </div>
            </button>
          </div>
        </div>

        {/* Script Composer */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          {isCustom ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-100">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Presentation Title
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Q3 Customer Retention Findings"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Minutes
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value) || 3)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Audience
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={customAudience}
                  onChange={(e) => setCustomAudience(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          ) : (
            activeTopic && (
              <div className="pb-5 border-b border-slate-100 space-y-3">
                <div className="text-xs text-slate-500">
                  <span>Audience: {activeTopic.audience}</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Recommended: {activeTopic.recommendedDurationMinutes} min (~
                    {activeTopic.recommendedDurationMinutes * 130} words)
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{activeTopic.context}</p>
                <div className="pt-1">
                  <div className="text-xs font-semibold text-slate-800 mb-1.5">
                    Recommended Structural Checkpoints:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
                    {activeTopic.keyPointsToCover.map((pt, i) => (
                      <li key={i}>
                        <span className="font-mono text-indigo-600 mr-1.5">0{i + 1}.</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleEvaluatePresentation} className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="presentation-script" className="font-semibold text-slate-800">
                  2. Draft Your Spoken Presentation Script
                </label>
                <span className="font-mono tabular-nums text-slate-500">
                  {wordCount} words · ~{estMinutes} min at 130 wpm
                </span>
              </div>
              <textarea
                id="presentation-script"
                rows={10}
                maxLength={8000}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Good morning everyone. Today I want to walk you through the bottleneck we uncovered in student onboarding, the three architectural decisions we took to resolve it, and the 38% drop in completion time we measured..."
                className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs text-slate-500">
                Includes structural pacing feedback &amp; complete sample improved presentation.
              </span>
              <button
                type="submit"
                disabled={evaluating || script.trim().length < 20}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Script...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Evaluate Presentation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Side-by-Side Presentation Evaluation & Sample Improved Presentation */}
      {lastEvaluation && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Submitted: {lastEvaluation.wordCount} words (~{lastEvaluation.estimatedMinutes} min)
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Presentation Evaluation: {lastEvaluation.report.overallScore}/100
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 cursor-pointer whitespace-nowrap"
            >
              Open Full 8-Part Rubric Report
            </button>
          </div>

          {lastEvaluation.deliveryNotes.length > 0 && (
            <div className="pb-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Structural Pacing &amp; Delivery Signposting Suggestions
              </h3>
              <ul className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                {lastEvaluation.deliveryNotes.map((note, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-mono text-indigo-600 mr-1.5">0{idx + 1}.</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-2">Your Submitted Script</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {lastEvaluation.originalScript}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-indigo-700 mb-2">
                Sample Improved Presentation Script
              </h3>
              <div className="p-4 rounded-xl bg-indigo-50/30 border border-indigo-200 text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                {lastEvaluation.report.improvedVersion}
              </div>
            </div>
          </div>
        </div>
      )}

      <FeedbackReportModal
        report={modalOpen && lastEvaluation ? lastEvaluation.report : null}
        onClose={() => setModalOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

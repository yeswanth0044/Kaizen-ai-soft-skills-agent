import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import type { AppSection, FeedbackReport } from '../types/kaizen.ts';

interface FeedbackReportModalProps {
  report: FeedbackReport | null;
  onClose: () => void;
  onNavigate?: (section: AppSection) => void;
}

export function FeedbackReportModal({
  report,
  onClose,
  onNavigate,
}: FeedbackReportModalProps) {
  if (!report) return null;

  const inferTargetSection = (recommendationText: string): AppSection => {
    const lower = recommendationText.toLowerCase();
    if (lower.includes('interview')) return 'interviews';
    if (lower.includes('presentation')) return 'presentations';
    if (lower.includes('scenario')) return 'scenarios';
    return 'coach';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="capitalize">{report.sourceType} Evaluation Report</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {report.createdAt.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h2 id="report-modal-title" className="mt-1 text-xl font-bold text-slate-900">
              {report.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable 8-Part Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* 1. Overall Score + Criterion Sub-Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 pb-6 border-b border-slate-200">
            <div className="col-span-2 sm:col-span-1 pr-4 sm:border-r border-slate-200">
              <div className="text-xs text-slate-500">1. Overall Score</div>
              <div className="mt-1 font-mono tabular-nums text-3xl font-bold text-indigo-600">
                {report.overallScore}
                <span className="text-sm font-normal text-slate-400">/100</span>
              </div>
            </div>
            {[
              { label: 'Clarity', val: report.clarityScore },
              { label: 'Grammar', val: report.grammarScore },
              { label: 'Structure', val: report.structureScore },
              { label: 'Vocabulary', val: report.vocabularyScore },
              { label: 'Confidence', val: report.confidenceScore },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
                  {m.val}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, m.val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 2. Strengths & 3. Areas for Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Observed Strengths</h3>
              {report.strengths.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No specific strengths recorded.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.strengths.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="font-mono text-xs text-emerald-700 mr-2">
                        0{idx + 1}.
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">3. Areas for Improvement</h3>
              {report.improvements.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No priority gaps flagged.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.improvements.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="font-mono text-xs text-amber-700 mr-2">
                        0{idx + 1}.
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 4. Grammar Corrections & 5. Vocabulary Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">4. Grammar &amp; Mechanics</h3>
              {report.grammarCorrections.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-700">
                  Clean grammatical mechanics—no structural errors flagged.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.grammarCorrections.map((g, idx) => (
                    <li key={idx} className="leading-relaxed">
                      · {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">5. Vocabulary Upgrades</h3>
              {report.vocabularySuggestions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  Vocabulary was well calibrated to the scenario.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {report.vocabularySuggestions.map((v, idx) => (
                    <li key={idx} className="leading-relaxed">
                      · {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 6. Improved Version of User Response */}
          <div className="pb-6 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              6. Polished Exemplar Rewrite
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Model revision preserving your core facts with stronger structure and executive phrasing:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {report.improvedVersion}
            </div>
          </div>

          {/* 7. Actionable Recommendations & 8. Suggested Next Exercise */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-7">
              <h3 className="text-sm font-bold text-slate-900">
                7. Actionable Coaching Takeaways
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-mono text-xs text-indigo-600 mr-2">
                      0{idx + 1}.
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900">8. Suggested Next Exercise</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {report.suggestedNextExercise}
              </p>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    const target = inferTargetSection(report.suggestedNextExercise);
                    onClose();
                    onNavigate(target);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Open Recommended Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

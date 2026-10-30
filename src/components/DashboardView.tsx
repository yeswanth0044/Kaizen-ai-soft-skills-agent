import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getTodayDateKey } from '../services/firestoreService.ts';
import { COMMUNICATION_SCENARIOS, SKILL_DEFINITIONS } from '../data/scenarios.ts';
import { FeedbackReportModal } from './FeedbackReportModal.tsx';
import type {
  AppSection,
  FeedbackReport,
  LearningActivity,
  SkillScore,
  UserProfile,
} from '../types/kaizen.ts';

interface DashboardViewProps {
  profile: UserProfile | null;
  activities: LearningActivity[];
  skillScores: SkillScore[];
  reports: FeedbackReport[];
  loading: boolean;
  onNavigate: (section: AppSection) => void;
}

export function DashboardView({
  profile,
  activities,
  skillScores,
  reports,
  loading,
  onNavigate,
}: DashboardViewProps) {
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);

  const todayKey = getTodayDateKey();
  const todayMinutes = useMemo(() => {
    return activities
      .filter((a) => a.dateKey === todayKey)
      .reduce((sum, a) => sum + a.durationMinutes, 0);
  }, [activities, todayKey]);

  const dailyGoal = profile?.dailyGoalMinutes || 20;
  const dailyProgressPct = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100));

  const chartData = useMemo(() => {
    const chronological = [...activities].reverse().slice(-12);
    return chronological.map((act, idx) => ({
      index: idx + 1,
      label: act.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: act.score,
      title: act.title,
    }));
  }, [activities]);

  const recommendedItems = useMemo(() => {
    const scoreMap = new Map(skillScores.map((s) => [s.skillKey, s.score]));
    const sortedDefs = [...SKILL_DEFINITIONS].sort(
      (a, b) => (scoreMap.get(a.key) ?? 0) - (scoreMap.get(b.key) ?? 0)
    );
    return sortedDefs.slice(0, 3).map((def) => {
      const current = scoreMap.get(def.key) ?? 0;
      const matchingScenario = COMMUNICATION_SCENARIOS.find((s) => s.targetSkill === def.key);
      let section: AppSection = 'coach';
      let actionLabel = 'Practice with Coach';
      if (def.key === 'interview') {
        section = 'interviews';
        actionLabel = 'Start Mock Interview';
      } else if (def.key === 'presentation') {
        section = 'presentations';
        actionLabel = 'Draft Presentation';
      } else if (matchingScenario) {
        section = 'scenarios';
        actionLabel = 'Launch Scenario';
      }
      return {
        key: def.key,
        title: matchingScenario ? matchingScenario.title : def.label,
        skillLabel: def.label,
        description: def.description,
        currentScore: current,
        section,
        actionLabel,
      };
    });
  }, [skillScores]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white border border-slate-200 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-white border border-slate-200 rounded-2xl" />
      </div>
    );
  }

  const firstName = (profile?.displayName || 'Learner').split(' ')[0];

  return (
    <div className="space-y-8">
      {/* Welcome & Daily Learning Goal Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>{profile?.headline || 'Soft Skills & Career Readiness'}</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.preferredDifficulty || 'Intermediate'} Difficulty</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {profile?.learningGoal ||
              'Consistent deliberate practice builds lasting clarity in interviews and workplace conversations.'}
          </p>
        </div>

        <div className="w-full lg:w-80 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-8">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Daily Learning Goal</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {todayMinutes} / {dailyGoal} min
            </span>
          </div>
          <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${dailyProgressPct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => onNavigate('coach')}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Continue Practice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4-Column Real Database KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Daily Learning Streak</div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {profile?.currentStreak ?? 0}
            <span className="text-sm font-normal text-slate-500 ml-1">days</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Best: {profile?.longestStreak ?? 0} days
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Practice Sessions</div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {profile?.totalSessions ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Completed across all modules
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Communication Score</div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {profile?.communicationScore ?? 0}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Weighted written rubric average
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Interview Readiness</div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {profile?.interviewReadinessScore ?? 0}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            STAR structure &amp; relevance index
          </div>
        </div>
      </div>

      {/* Main Split: Skills Improvement Chart + Recommended Exercises */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Skills Improvement Trend</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Session evaluation scores across your most recent completed exercises
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('progress')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Full Analytics
              </button>
            </div>

            {chartData.length === 0 ? (
              <div className="mt-8 py-14 text-center border border-dashed border-slate-200 rounded-xl px-6">
                <p className="text-sm font-semibold text-slate-800">
                  No evaluated practice sessions recorded yet
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Complete your first coaching session, mock interview, or presentation script to
                  populate your personal skill improvement curve.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('coach')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    Chat with AI Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('interviews')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                  >
                    Try a Mock Interview
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kaizenScoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="#4f46e5"
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill="url(#kaizenScoreGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Exercises */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900">Recommended Next Exercises</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized automatically around your lowest or unpracticed skill areas
          </p>

          <div className="mt-5 divide-y divide-slate-100">
            {recommendedItems.map((rec) => (
              <div key={rec.key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{rec.skillLabel}</span>
                  <span className="font-mono tabular-nums">
                    {rec.currentScore > 0 ? `Current: ${rec.currentScore}/100` : 'Unassessed'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{rec.title}</div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                <button
                  type="button"
                  onClick={() => onNavigate(rec.section)}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Practice Activities</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any completed session to inspect its full 8-part feedback report
            </p>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Your completed coaching sessions, mock interviews, and presentations will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-6">Session</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-6 text-right">Score</th>
                  <th className="py-3 px-6 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activities.slice(0, 8).map((act) => {
                  const matchingReport = reports.find(
                    (r) => r.sourceSessionId === act.sessionId || r.title === act.title
                  );
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-slate-900">{act.title}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 capitalize">
                        {act.activityType}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono tabular-nums">
                        {act.dateKey}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 text-right font-mono tabular-nums">
                        {act.durationMinutes} min
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {act.score}/100
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {matchingReport ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReport(matchingReport)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                          >
                            View Report
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FeedbackReportModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

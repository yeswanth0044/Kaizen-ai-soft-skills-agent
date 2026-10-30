import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SKILL_DEFINITIONS } from '../data/scenarios.ts';
import { FeedbackReportModal } from './FeedbackReportModal.tsx';
import type {
  AppSection,
  FeedbackReport,
  LearningActivity,
  SkillScore,
  UserProfile,
} from '../types/kaizen.ts';

interface ProgressViewProps {
  profile: UserProfile | null;
  activities: LearningActivity[];
  skillScores: SkillScore[];
  reports: FeedbackReport[];
  onNavigate: (section: AppSection) => void;
}

export function ProgressView({
  profile,
  activities,
  skillScores,
  reports,
  onNavigate,
}: ProgressViewProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [moduleFilter, setModuleFilter] = useState<
    'all' | 'coach' | 'interview' | 'scenario' | 'presentation'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);

  const periodDays = timeframe === 'weekly' ? 7 : 30;

  const performanceSeries = useMemo(() => {
    const today = new Date();
    const buckets: { key: string; label: string; totalScore: number; count: number; minutes: number }[] =
      [];

    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      buckets.push({
        key: `${y}-${m}-${day}`,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        totalScore: 0,
        count: 0,
        minutes: 0,
      });
    }

    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const act of activities) {
      const b = map.get(act.dateKey);
      if (b) {
        b.totalScore += act.score;
        b.count += 1;
        b.minutes += act.durationMinutes;
      }
    }

    return buckets.map((b) => ({
      label: b.label,
      avgScore: b.count > 0 ? Math.round(b.totalScore / b.count) : 0,
      minutes: b.minutes,
      sessions: b.count,
    }));
  }, [activities, periodDays]);

  const skillChartData = useMemo(() => {
    const scoreMap = new Map(skillScores.map((s) => [s.skillKey, s]));
    return SKILL_DEFINITIONS.map((def) => {
      const rec = scoreMap.get(def.key);
      const current = rec?.score ?? 0;
      const prev = rec?.previousScore ?? 0;
      return {
        skill: def.label,
        score: current,
        delta: prev > 0 ? current - prev : 0,
        sessions: rec?.sessionsCount ?? 0,
      };
    });
  }, [skillScores]);

  const interviewTrendData = useMemo(() => {
    return [...reports]
      .filter((r) => r.sourceType === 'interview')
      .reverse()
      .map((r, idx) => ({
        session: `#${idx + 1}`,
        title: r.title,
        score: r.overallScore,
        structure: r.structureScore,
      }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (moduleFilter !== 'all' && r.sourceType !== moduleFilter) return false;
      if (
        searchQuery.trim() &&
        !r.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [reports, moduleFilter, searchQuery]);

  const periodSummary = useMemo(() => {
    const totalMinutes = performanceSeries.reduce((s, d) => s + d.minutes, 0);
    const totalSessions = performanceSeries.reduce((s, d) => s + d.sessions, 0);
    const scoredDays = performanceSeries.filter((d) => d.avgScore > 0);
    const avgScore =
      scoredDays.length > 0
        ? Math.round(scoredDays.reduce((s, d) => s + d.avgScore, 0) / scoredDays.length)
        : 0;
    return { totalMinutes, totalSessions, avgScore };
  }, [performanceSeries]);

  return (
    <div className="space-y-8">
      {/* Header & Weekly / Monthly Toggle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Progress Tracking &amp; Skill Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track weekly and monthly consistency, skill-wise mastery across 8 dimensions, and
            archived evaluation reports.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => setTimeframe('weekly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              timeframe === 'weekly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly (7d)
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('monthly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              timeframe === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly (30d)
          </button>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">
            {timeframe === 'weekly' ? '7-Day' : '30-Day'} Sessions
          </div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {periodSummary.totalSessions}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">
            {timeframe === 'weekly' ? '7-Day' : '30-Day'} Practice Time
          </div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {periodSummary.totalMinutes}
            <span className="text-sm font-normal text-slate-500 ml-1">min</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Period Average Score</div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {periodSummary.avgScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Current / Longest Streak</div>
          <div className="mt-2 font-mono tabular-nums text-3xl font-bold text-slate-900">
            {profile?.currentStreak ?? 0}
            <span className="text-sm font-normal text-slate-400">
              {' '}
              / {profile?.longestStreak ?? 0}d
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Score & Activity Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900">
            {timeframe === 'weekly' ? 'Weekly' : 'Monthly'} Performance Scores
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Average rubric score out of 100 recorded per active practice day
          </p>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  interval={timeframe === 'monthly' ? 4 : 0}
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
                <Bar dataKey="avgScore" name="Avg Score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interview Readiness Trend */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mock Interview Trajectory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overall score &amp; STAR structure progression across interviews
            </p>

            {interviewTrendData.length === 0 ? (
              <div className="mt-8 py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs font-medium text-slate-700">
                  Complete a Mock Interview to unlock your interview readiness curve.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('interviews')}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 cursor-pointer"
                >
                  Launch Mock Interview
                </button>
              </div>
            ) : (
              <div className="mt-6 h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={interviewTrendData}
                    margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="session"
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
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Overall Score"
                      stroke="#4f46e5"
                      strokeWidth={2.2}
                      dot={{ r: 3.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="structure"
                      name="STAR Structure"
                      stroke="#0f172a"
                      strokeWidth={1.8}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8-Skill Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-900">Skill-Wise Mastery Breakdown</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Measured across your evaluated coaching dialogues, scenarios, interviews, and presentations
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {skillChartData.map((item) => (
            <div key={item.skill} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 truncate">{item.skill}</span>
                <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                  {item.score > 0 ? `${item.score}/100` : '—'}
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, item.score)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>{item.sessions} sessions</span>
                {item.delta !== 0 && (
                  <span className={item.delta > 0 ? 'text-emerald-700' : 'text-amber-700'}>
                    {item.delta > 0 ? `+${item.delta}` : item.delta} vs prior
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filterable Evaluation Report History */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Feedback Reports Archive</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter by module or search session titles to review detailed coaching critiques
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'coach', 'interview', 'scenario', 'presentation'] as const).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setModuleFilter(mod)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    moduleFilter === mod
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No matching feedback reports found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-6">Report Title</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4 text-right">Clarity</th>
                  <th className="py-3 px-4 text-right">Structure</th>
                  <th className="py-3 px-4 text-right">Overall</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-900">{rep.title}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 capitalize">
                      {rep.sourceType}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                      {rep.clarityScore}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                      {rep.structureScore}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {rep.overallScore}/100
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(rep)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                      >
                        Inspect Report
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
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

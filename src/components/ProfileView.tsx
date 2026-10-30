import React, { useEffect, useState } from 'react';
import { Check, Loader2, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { SKILL_DEFINITIONS } from '../data/scenarios.ts';
import { updateUserProfileSettings } from '../services/firestoreService.ts';
import type { DifficultyLevel, LearningActivity, UserProfile } from '../types/kaizen.ts';

interface ProfileViewProps {
  profile: UserProfile | null;
  activities: LearningActivity[];
}

export function ProfileView({ profile, activities }: ProfileViewProps) {
  const { user, logout } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(20);
  const [preferredDifficulty, setPreferredDifficulty] =
    useState<DifficultyLevel>('Intermediate');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setHeadline(profile.headline);
      setLearningGoal(profile.learningGoal);
      setDailyGoalMinutes(profile.dailyGoalMinutes);
      setPreferredDifficulty(profile.preferredDifficulty);
      setFocusAreas(profile.focusAreas);
    }
  }, [profile]);

  const toggleFocusArea = (label: string) => {
    setFocusAreas((prev) => {
      if (prev.includes(label)) {
        return prev.filter((item) => item !== label);
      }
      if (prev.length >= 6) return prev;
      return [...prev, label];
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (displayName.trim().length < 2) {
      setStatusNotice({
        type: 'error',
        message: 'Display name must be at least 2 characters.',
      });
      return;
    }

    setSaving(true);
    setStatusNotice(null);

    try {
      await updateUserProfileSettings(user.uid, user.email || '', {
        displayName: displayName.trim(),
        headline: headline.trim(),
        learningGoal: learningGoal.trim(),
        dailyGoalMinutes,
        preferredDifficulty,
        focusAreas,
      });
      setStatusNotice({
        type: 'success',
        message: 'Your coaching profile and learning preferences have been saved.',
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Profile & Coaching Preferences Form */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Profile &amp; Coaching Preferences
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Customize how KAIZEN tailors mock interviews, daily practice targets, and mentor
            feedback.
          </p>
        </div>

        {statusNotice && (
          <div
            className={`mt-6 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{statusNotice.message}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                maxLength={100}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="prof-headline"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Target Role or Academic Status
              </label>
              <input
                id="prof-headline"
                type="text"
                maxLength={160}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., Final-Year CS Student · Backend & Product"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-goal" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Soft Skills Learning Goal
            </label>
            <textarea
              id="prof-goal"
              rows={3}
              maxLength={300}
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              placeholder="Describe what you are preparing for (campus placements, leadership roles, client presentations...)"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Preferred Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['Beginner', 'Intermediate', 'Advanced'] as DifficultyLevel[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPreferredDifficulty(tier)}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      preferredDifficulty === tier
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="prof-minutes"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Daily Learning Goal (Minutes)
              </label>
              <input
                id="prof-minutes"
                type="number"
                min={5}
                max={180}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(Number(e.target.value) || 20)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Priority Focus Skills (Select up to 6)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {focusAreas.length}/6 selected
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SKILL_DEFINITIONS.map((skill) => {
                const active = focusAreas.includes(skill.label);
                return (
                  <button
                    key={skill.key}
                    type="button"
                    onClick={() => toggleFocusArea(skill.label)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-50/40 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-medium">{skill.label}</span>
                    {active && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Profile Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right: Account Summary & Practice History Snapshot */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Account Details</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-900 truncate">{user?.email}</span>
            </div>
            <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Email Verification</span>
              <span className="font-medium text-emerald-700">Verified</span>
            </div>
            <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Completed Sessions</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {profile?.totalSessions ?? 0}
              </span>
            </div>
            <div className="flex justify-between gap-2 py-1.5">
              <span className="text-slate-500">Longest Streak</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {profile?.longestStreak ?? 0} days
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of KAIZEN</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900">Recent Session Log</h2>
          {activities.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              No completed practice activities yet.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{act.title}</div>
                    <div className="text-slate-500 font-mono tabular-nums">{act.dateKey}</div>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                    {act.score}/100
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

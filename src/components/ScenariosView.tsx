import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { COMMUNICATION_SCENARIOS } from '../data/scenarios.ts';
import {
  appendSessionMessage,
  appendTurnPairBatch,
  completePracticeSession,
  createPracticeSession,
  saveFeedbackReportAndProgress,
  subscribeSessionMessages,
} from '../services/firestoreService.ts';
import {
  generateSessionReportApi,
  submitScenarioTurnApi,
} from '../services/apiClient.ts';
import { FeedbackReportModal } from './FeedbackReportModal.tsx';
import type {
  AppSection,
  DifficultyLevel,
  FeedbackReport,
  PracticeSession,
  ScenarioDefinition,
  SessionMessage,
} from '../types/kaizen.ts';

interface ScenariosViewProps {
  onNavigate: (section: AppSection) => void;
}

export function ScenariosView({ onNavigate }: ScenariosViewProps) {
  const { user, profile } = useAuth();
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | DifficultyLevel>('All');
  const [activeScenario, setActiveScenario] = useState<ScenarioDefinition | null>(null);
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticUserText, setOptimisticUserText] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [modalReport, setModalReport] = useState<FeedbackReport | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user || !activeSession) {
      setMessages([]);
      return;
    }
    const unsub = subscribeSessionMessages(user.uid, activeSession.id, (loaded) => {
      setMessages(loaded);
    });
    return () => unsub();
  }, [user, activeSession?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const filteredScenarios = COMMUNICATION_SCENARIOS.filter(
    (s) => difficultyFilter === 'All' || s.difficulty === difficultyFilter
  );

  const handleLaunchScenario = async (scenario: ScenarioDefinition) => {
    if (!user) return;
    setErrorMessage(null);
    setSending(true);
    try {
      const sess = await createPracticeSession({
        uid: user.uid,
        sessionType: 'scenario',
        title: scenario.title,
        scenarioId: scenario.id,
        difficulty: scenario.difficulty,
      });

      await appendSessionMessage({
        uid: user.uid,
        sessionId: sess.id,
        role: 'assistant',
        content: scenario.openingLine,
        score: 0,
        nextMessageCount: 1,
        latestScore: 0,
      });

      setActiveScenario(scenario);
      setActiveSession(sess);
      setInput('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start workplace scenario.');
    } finally {
      setSending(false);
    }
  };

  const handleSendTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeScenario || !activeSession || sending) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    setErrorMessage(null);
    setSending(true);
    setOptimisticUserText(trimmed);
    setInput('');

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await submitScenarioTurnApi({
        scenarioId: activeScenario.id,
        difficulty: activeScenario.difficulty,
        message: trimmed,
        history: historyPayload,
      });

      const counterpartTurn = `${result.mentorReply}\n\n${result.followUpQuestion}`;

      await appendTurnPairBatch({
        uid: user.uid,
        sessionId: activeSession.id,
        userContent: trimmed,
        assistantContent: counterpartTurn,
        score: result.score,
        improvedResponse: result.improvedResponse,
        grammarNotes: result.grammarNotes,
        clarityNote: result.clarityNote,
        nextMessageCount: messages.length + 2,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit role-play turn.');
      setInput(trimmed);
    } finally {
      setOptimisticUserText(null);
      setSending(false);
    }
  };

  const handleFinishScenario = async () => {
    if (!user || !activeScenario || !activeSession || messages.length < 2 || finishing) return;
    setFinishing(true);
    setErrorMessage(null);

    try {
      const reportData = await generateSessionReportApi({
        sessionTitle: activeScenario.title,
        sourceType: 'scenario',
        difficulty: activeScenario.difficulty,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      await completePracticeSession({
        sessionId: activeSession.id,
        messageCount: messages.length,
        latestScore: reportData.overallScore,
      });

      const saved = await saveFeedbackReportAndProgress({
        uid: user.uid,
        currentProfile: profile,
        sourceType: 'scenario',
        sourceSessionId: activeSession.id,
        title: `Scenario: ${activeScenario.title}`,
        overallScore: reportData.overallScore,
        clarityScore: reportData.clarityScore,
        grammarScore: reportData.grammarScore,
        structureScore: reportData.structureScore,
        vocabularyScore: reportData.vocabularyScore,
        confidenceScore: reportData.confidenceScore,
        strengths: reportData.strengths,
        improvements: reportData.improvements,
        grammarCorrections: reportData.grammarCorrections,
        vocabularySuggestions: reportData.vocabularySuggestions,
        improvedVersion: reportData.improvedVersion,
        recommendations: reportData.recommendations,
        suggestedNextExercise: reportData.suggestedNextExercise,
        durationMinutes: Math.max(5, Math.round(messages.length * 2.5)),
        primarySkillKey: activeScenario.targetSkill,
      });

      setActiveScenario(null);
      setActiveSession(null);
      setModalReport(saved);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate scenario report.');
    } finally {
      setFinishing(false);
    }
  };

  if (activeScenario && activeSession) {
    const userTurnCount = messages.filter((m) => m.role === 'user').length;
    return (
      <div className="space-y-6">
        {/* Scenario Briefing Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveScenario(null);
                setActiveSession(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Workplace Scenarios</span>
            </button>

            {userTurnCount >= 1 && (
              <button
                type="button"
                disabled={finishing}
                onClick={handleFinishScenario}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {finishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>Complete Role-Play &amp; Get Feedback Report</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
            <div className="lg:col-span-7">
              <div className="text-xs text-slate-500">
                <span>{activeScenario.category}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{activeScenario.difficulty}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>Role-Playing with {activeScenario.counterpartName}</span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-900">{activeScenario.title}</h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeScenario.situation}
              </p>
            </div>
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-900">Your Objective</div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {activeScenario.userObjective}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Role-Play Conversation Window */}
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 space-y-5 max-h-[55vh] overflow-y-auto">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              const open = expandedIds[m.id] ?? true;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-slate-400 mb-1 font-mono tabular-nums">
                    {isUser ? 'You' : activeScenario.counterpartName}
                    {isUser && m.score > 0 ? ` · Turn Score ${m.score}/100` : ''}
                  </div>
                  <div
                    className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    {m.content}
                  </div>

                  {isUser && m.improvedResponse && (
                    <div className="mt-2 max-w-2xl w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIds((prev) => ({ ...prev, [m.id]: !open }))
                        }
                        className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <span>Coach’s Phrasing Upgrade</span>
                        {open ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {open && (
                        <div className="px-4 pb-3 pt-1.5 border-t border-slate-200/70 text-xs space-y-1.5">
                          {m.clarityNote && (
                            <p className="text-slate-600">{m.clarityNote}</p>
                          )}
                          <p className="text-indigo-700 font-medium">{m.improvedResponse}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {optimisticUserText && (
              <div className="flex flex-col items-end">
                <div className="text-[11px] text-slate-400 mb-1 font-mono tabular-nums">
                  You · Just now
                </div>
                <div className="max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900 text-white">
                  {optimisticUserText}
                </div>
              </div>
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{activeScenario.counterpartName} is responding...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSendTurn}
            className="p-4 border-t border-slate-200 bg-white flex items-end gap-3"
          >
            <textarea
              rows={2}
              maxLength={4000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendTurn(e);
                }
              }}
              placeholder={`Reply to ${activeScenario.counterpartName.split(',')[0]}...`}
              className="flex-1 resize-none px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Reply</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workplace Communication Scenarios
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Step into realistic conversations with managers, peers, and stakeholders. The AI
            role-plays the other participant while coaching your phrasing on every turn.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setDifficultyFilter(tier)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                difficultyFilter === tier
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>{scenario.category}</span>
                <span aria-hidden="true">·</span>
                <span>{scenario.difficulty}</span>
              </div>
              <h2 className="mt-2 text-base font-bold text-slate-900">{scenario.title}</h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{scenario.situation}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                Counterpart: <span className="text-slate-700 font-medium">{scenario.counterpartName}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={sending}
              onClick={() => void handleLaunchScenario(scenario)}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Start Role-Play</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <FeedbackReportModal
        report={modalReport}
        onClose={() => setModalReport(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

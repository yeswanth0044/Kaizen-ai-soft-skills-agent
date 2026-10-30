import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Send,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  appendTurnPairBatch,
  completePracticeSession,
  createPracticeSession,
  deletePracticeSession,
  saveFeedbackReportAndProgress,
  subscribePracticeSessions,
  subscribeSessionMessages,
} from '../services/firestoreService.ts';
import {
  generateSessionReportApi,
  sendCoachMessageApi,
} from '../services/apiClient.ts';
import { ResilientImage } from './ResilientImage.tsx';
import { FeedbackReportModal } from './FeedbackReportModal.tsx';
import type {
  AppSection,
  DifficultyLevel,
  FeedbackReport,
  PracticeSession,
  SessionMessage,
} from '../types/kaizen.ts';

const MENTOR_AVATAR = '/src/assets/images/kaizen_mentor_avatar_1793341869734.jpg';

const STARTER_PROMPTS = [
  'Help me tighten my 60-second "Tell me about yourself" introduction for software engineering interviews.',
  'How do I politely push back when a teammate assigns me last-minute tasks without checking my bandwidth?',
  'Review this message to my manager explaining why our project milestone needs two extra days.',
  'Let’s practice speaking more concisely without hedging words like "just" or "kind of".',
];

interface CoachViewProps {
  onNavigate: (section: AppSection) => void;
}

export function CoachView({ onNavigate }: CoachViewProps) {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticUserText, setOptimisticUserText] = useState<string | null>(null);
  const [expandedMsgIds, setExpandedMsgIds] = useState<Record<string, boolean>>({});
  const [modalReport, setModalReport] = useState<FeedbackReport | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribePracticeSessions(user.uid, 'coach', (loaded) => {
      setSessions(loaded);
      setActiveSessionId((prev) => {
        if (prev && loaded.some((s) => s.id === prev)) return prev;
        return loaded[0]?.id ?? null;
      });
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !activeSessionId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeSessionMessages(user.uid, activeSessionId, (loaded) => {
      setMessages(loaded);
    });
    return () => unsub();
  }, [user, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const difficulty: DifficultyLevel =
    activeSession?.difficulty || profile?.preferredDifficulty || 'Intermediate';

  const handleStartNewSession = async () => {
    if (!user) return;
    setErrorMessage(null);
    try {
      const created = await createPracticeSession({
        uid: user.uid,
        sessionType: 'coach',
        title: 'New Coaching Conversation',
        difficulty: profile?.preferredDifficulty || 'Intermediate',
      });
      setActiveSessionId(created.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create coaching session.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    setErrorMessage(null);
    try {
      await deletePracticeSession(user.uid, sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to clear session.');
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    if (!user || sending) return;
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed) return;

    setErrorMessage(null);
    setSending(true);
    setOptimisticUserText(trimmed);
    if (!textOverride) setInput('');

    try {
      let targetSession = activeSession;
      if (!targetSession || targetSession.status === 'completed') {
        targetSession = await createPracticeSession({
          uid: user.uid,
          sessionType: 'coach',
          title: trimmed.slice(0, 56),
          difficulty: profile?.preferredDifficulty || 'Intermediate',
        });
        setActiveSessionId(targetSession.id);
      }

      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Fast low-latency Coach evaluation
      const evaluation = await sendCoachMessageApi({
        message: trimmed,
        history: historyPayload,
        difficulty: targetSession.difficulty,
        focusGoal: profile?.learningGoal,
        userName: profile?.displayName,
      });

      const autoTitle =
        messages.length === 0 && targetSession.title === 'New Coaching Conversation'
          ? trimmed.slice(0, 64)
          : undefined;

      const combinedMentorReply = `${evaluation.mentorReply}\n\n${evaluation.followUpQuestion}`;

      // Single atomic Firestore batch write instead of 4 sequential round-trips
      await appendTurnPairBatch({
        uid: user.uid,
        sessionId: targetSession.id,
        userContent: trimmed,
        assistantContent: combinedMentorReply,
        score: evaluation.score,
        improvedResponse: evaluation.improvedResponse,
        grammarNotes: evaluation.grammarNotes,
        clarityNote: evaluation.clarityNote,
        nextMessageCount: messages.length + 2,
        updatedTitle: autoTitle,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to evaluate message. Please try again.'
      );
      if (!textOverride) setInput(trimmed);
    } finally {
      setOptimisticUserText(null);
      setSending(false);
    }
  };

  const handleCompleteAndGenerateReport = async () => {
    if (!user || !activeSession || messages.length < 2 || generatingReport) return;
    setGeneratingReport(true);
    setErrorMessage(null);

    try {
      const reportData = await generateSessionReportApi({
        sessionTitle: activeSession.title,
        sourceType: 'coach',
        difficulty: activeSession.difficulty,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (activeSession.status !== 'completed') {
        await completePracticeSession({
          sessionId: activeSession.id,
          messageCount: messages.length,
          latestScore: reportData.overallScore,
        });
      }

      const savedReport = await saveFeedbackReportAndProgress({
        uid: user.uid,
        currentProfile: profile,
        sourceType: 'coach',
        sourceSessionId: activeSession.id,
        title: `Coach Session: ${activeSession.title}`,
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
        primarySkillKey: 'communication',
      });

      setModalReport(savedReport);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not generate session feedback report.'
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  const toggleExpandAnalysis = (msgId: string) => {
    setExpandedMsgIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-8.5rem)]">
      {/* Left Column: Session History & Management */}
      <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Coaching Sessions</h2>
          <button
            type="button"
            onClick={handleStartNewSession}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-60 lg:max-h-none">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No coaching threads yet. Send a message or pick a starter prompt to begin.
            </div>
          ) : (
            sessions.map((sess) => {
              const selected = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  className={`p-3.5 flex items-start justify-between gap-2 transition-colors ${
                    selected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSessionId(sess.id)}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {sess.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                      <span>{sess.status === 'completed' ? 'Completed' : 'Active'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {sess.latestScore > 0 ? `${sess.latestScore}/100` : `${sess.messageCount} msgs`}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSession(sess.id)}
                    aria-label="Delete session"
                    title="Clear & delete session"
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Interactive Mentor Workspace */}
      <div className="lg:col-span-8 xl:col-span-9 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
        {/* Session Top Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ResilientImage
              src={MENTOR_AVATAR}
              alt="KAIZEN Executive Communication Mentor"
              fallbackLabel="KAIZEN"
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                {activeSession ? activeSession.title : 'KAIZEN Soft Skills Mentor'}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>{difficulty} Tier</span>
                <span aria-hidden="true">·</span>
                <span>Written Clarity, Grammar &amp; Structure Evaluation</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeSession && messages.length >= 2 && (
              <button
                type="button"
                disabled={generatingReport}
                onClick={handleCompleteAndGenerateReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {generatingReport ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>
                  {activeSession.status === 'completed'
                    ? 'Regenerate Report'
                    : 'Finish & Get Report'}
                </span>
              </button>
            )}
            {activeSession && (
              <button
                type="button"
                onClick={() => void handleDeleteSession(activeSession.id)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 max-h-[60vh] lg:max-h-[calc(100vh-18rem)]">
          {messages.length === 0 && !optimisticUserText ? (
            <div className="py-8 max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-slate-900">
                What communication situation would you like to rehearse today?
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Write naturally as you would in an interview, meeting, or Slack/email thread. Each
                response you send is evaluated strictly on written clarity, grammar, and structure—with
                an instant exemplar rewrite.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSendMessage(prompt)}
                    className="p-4 text-left text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer leading-relaxed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isExpanded = expandedMsgIds[msg.id] ?? true;
              const timeStr = msg.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5 font-mono tabular-nums">
                    <span>{isUser ? 'You' : 'KAIZEN Mentor'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeStr}</span>
                    {isUser && msg.score > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-indigo-600 font-semibold">
                          Score {msg.score}/100
                        </span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Inline Written Communication Diagnostics for User Messages */}
                  {isUser && (msg.improvedResponse || msg.clarityNote) && (
                    <div className="mt-2 max-w-2xl w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleExpandAnalysis(msg.id)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
                      >
                        <span>
                          Written Communication Feedback · Stronger Phrasing Suggestion
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-200/70 space-y-3 text-xs">
                          {msg.clarityNote && (
                            <div>
                              <span className="font-semibold text-slate-800">
                                Clarity &amp; Written Confidence:{' '}
                              </span>
                              <span className="text-slate-600">{msg.clarityNote}</span>
                            </div>
                          )}

                          {msg.grammarNotes.length > 0 && (
                            <div>
                              <div className="font-semibold text-slate-800 mb-1">
                                Grammar &amp; Mechanics Notes:
                              </div>
                              <ul className="space-y-1 text-slate-600">
                                {msg.grammarNotes.map((note, idx) => (
                                  <li key={idx}>· {note}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.improvedResponse && (
                            <div className="pt-2 border-t border-slate-200/70">
                              <div className="font-semibold text-indigo-700 mb-1">
                                Suggested Stronger Response:
                              </div>
                              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {msg.improvedResponse}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Optimistic User Bubble + Typing Indicator */}
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
            <div className="flex flex-col items-start">
              <div className="text-[11px] text-slate-400 mb-1 font-mono">
                KAIZEN Mentor · Replying...
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Evaluating phrasing and generating coaching reply...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {activeSession?.status === 'completed' ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600">
                This coaching session has been finalized and archived.
              </span>
              <button
                type="button"
                onClick={handleStartNewSession}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer whitespace-nowrap"
              >
                Start New Coaching Session
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="flex items-end gap-3"
            >
              <textarea
                rows={2}
                maxLength={5000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Write your response or paste a workplace draft... (Enter to send, Shift+Enter for new line)"
                className="flex-1 resize-none px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <FeedbackReportModal
        report={modalReport}
        onClose={() => setModalReport(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

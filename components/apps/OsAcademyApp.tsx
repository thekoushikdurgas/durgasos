'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { BookOpen, HelpCircle, Check, X, ArrowRight, Loader2, Award } from 'lucide-react';
import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface Topic {
  id: number;
  title: string;
  coreFocus: string;
  content: string;
  quiz: QuizQuestion[];
}

export function OsAcademyApp() {
  const { callStreaming } = useJsonRpcStream();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ topicId: number; title: string; content: string; similarity: number }>>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    callStreaming(
      'os_labs.search_topics',
      { query },
      {
        onDone: (res) => {
          setSearchResults((res.results as any[]) || []);
          setSearching(false);
        },
        onError: () => {
          setSearching(false);
        }
      }
    ).catch(() => {
      setSearching(false);
    });
  }, [callStreaming]);

  // App UI Tabs: 'lesson' | 'quiz'
  const [activeTab, setActiveTab] = useState<'lesson' | 'quiz'>('lesson');

  // Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    callStreaming(
      'os_labs.get_topics',
      {},
      {
        onDone: (res) => {
          if (!active) return;
          const fetched = (res.topics as Topic[]) || [];
          setTopics(fetched);
          setLoading(false);
        },
        onError: (err) => {
          if (!active) return;
          setError(err);
          setLoading(false);
        },
      }
    ).catch((err) => {
      if (!active) return;
      setError(String(err));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [callStreaming]);

  const currentTopic = topics.find((t) => t.id === selectedTopicId);

  const handleSelectTopic = (id: number) => {
    setSelectedTopicId(id);
    setActiveTab('lesson');
    setSelectedAnswers({});
    setSubmittedQuestions({});
    setScore(0);
    setQuizFinished(false);
  };

  const handleAnswerSelect = (qIdx: number, oIdx: number) => {
    if (submittedQuestions[qIdx]) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmitAnswer = (qIdx: number) => {
    if (selectedAnswers[qIdx] === undefined || submittedQuestions[qIdx]) return;
    setSubmittedQuestions((prev) => ({ ...prev, [qIdx]: true }));

    const isCorrect = selectedAnswers[qIdx] === currentTopic?.quiz[qIdx].answerIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleFinishQuiz = () => {
    setQuizFinished(true);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/20 text-xs text-white/50 backdrop-blur-sm">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-2" />
        <span>Loading OS Academy Modules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-red-400 bg-slate-950/30">
        <X className="h-8 w-8 text-red-400/80 mb-2" />
        <p className="font-semibold text-sm">Failed to connect to OS Labs API</p>
        <p className="text-xs text-white/40 mt-1 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-950/20 text-white/90">
      {/* Sidebar List */}
      <aside className="w-72 border-r border-white/10 bg-black/40 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cyan-400" />
          <span className="font-bold text-sm tracking-wider uppercase text-white/80">
            OS Modules
          </span>
        </div>
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search OS concepts..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searching && (
              <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-cyan-400" />
            )}
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {searchQuery.trim() ? (
            searchResults.length > 0 ? (
              searchResults.map((res) => (
                <button
                  key={res.topicId}
                  type="button"
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-200 text-xs border border-transparent',
                    res.topicId === selectedTopicId
                      ? 'bg-cyan-500/25 border-cyan-500/35 text-cyan-200'
                      : 'hover:bg-white/5 text-white/60 hover:text-white/90'
                  )}
                  onClick={() => handleSelectTopic(res.topicId)}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="truncate">{res.topicId}. {res.title}</span>
                    <span className="text-[9px] text-cyan-400 font-mono">{(res.similarity * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-[10px] opacity-40 line-clamp-1 mt-0.5">{res.content}</div>
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-white/30">No matches found.</div>
            )
          ) : (
            topics.map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-200 text-xs',
                  t.id === selectedTopicId
                    ? 'bg-cyan-500/25 border border-cyan-500/35 text-cyan-200'
                    : 'hover:bg-white/5 border border-transparent text-white/60 hover:text-white/90'
                )}
                onClick={() => handleSelectTopic(t.id)}
              >
                <div className="font-semibold truncate">
                  {t.id}. {t.title}
                </div>
                <div className="text-[10px] opacity-50 truncate mt-0.5">{t.coreFocus}</div>
              </button>
            ))
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/10">
        {currentTopic && (
          <>
            {/* Header / Tabs */}
            <header className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-white/90">{currentTopic.title}</h1>
                <p className="text-xs text-white/45 mt-0.5">{currentTopic.coreFocus}</p>
              </div>

              <div className="flex items-center rounded-lg bg-black/40 p-1 border border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('lesson')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-semibold transition-all',
                    activeTab === 'lesson'
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/20 shadow-sm'
                      : 'text-white/45 hover:text-white'
                  )}
                >
                  Lesson
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-semibold transition-all',
                    activeTab === 'quiz'
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/20 shadow-sm'
                      : 'text-white/45 hover:text-white'
                  )}
                >
                  Interactive Quiz
                </button>
              </div>
            </header>

            {/* Tab Panels */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'lesson' ? (
                <article className="max-w-3xl prose prose-invert prose-sm text-white/80 leading-relaxed space-y-4">
                  {currentTopic.content.split('\n\n').map((para, pIdx) => {
                    if (para.startsWith('###')) {
                      return (
                        <h3
                          key={pIdx}
                          className="text-sm font-bold text-cyan-400 mt-6 mb-2 border-b border-cyan-500/10 pb-1 uppercase tracking-wider"
                        >
                          {para.replace('###', '').trim()}
                        </h3>
                      );
                    }
                    if (para.startsWith('-')) {
                      return (
                        <ul key={pIdx} className="list-disc list-inside space-y-1 text-xs pl-2">
                          {para.split('\n').map((li, lIdx) => (
                            <li key={lIdx} className="text-white/70">
                              {li.replace('-', '').trim()}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={pIdx} className="text-xs text-white/70">
                        {para}
                      </p>
                    );
                  })}
                </article>
              ) : (
                <div className="max-w-2xl space-y-6">
                  {currentTopic.quiz.map((q, qIdx) => {
                    const isSubmitted = submittedQuestions[qIdx];
                    const selectedOpt = selectedAnswers[qIdx];
                    const isCorrect = selectedOpt === q.answerIndex;

                    return (
                      <section
                        key={qIdx}
                        className="frost-glass-surface p-5 border border-white/10 rounded-xl space-y-4"
                      >
                        <div className="flex gap-2">
                          <HelpCircle className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                          <h4 className="text-xs font-semibold text-white/90 leading-normal">
                            Question {qIdx + 1}: {q.question}
                          </h4>
                        </div>

                        {/* Options */}
                        <div className="grid gap-2 pl-6">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = selectedOpt === oIdx;
                            const showSuccess = isSubmitted && oIdx === q.answerIndex;
                            const showFailure = isSubmitted && isSelected && !isCorrect;

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={isSubmitted}
                                onClick={() => handleAnswerSelect(qIdx, oIdx)}
                                className={cn(
                                  'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between',
                                  showSuccess &&
                                    'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
                                  showFailure && 'bg-red-500/15 border-red-500/40 text-red-200',
                                  !isSubmitted &&
                                    isSelected &&
                                    'bg-cyan-500/10 border-cyan-500/30 text-cyan-100',
                                  !isSubmitted &&
                                    !isSelected &&
                                    'border-white/5 bg-black/20 text-white/60 hover:bg-white/5 hover:text-white/90'
                                )}
                              >
                                <span>{opt}</span>
                                {showSuccess && <Check className="h-4 w-4 text-emerald-400" />}
                                {showFailure && <X className="h-4 w-4 text-red-400" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Submit Button */}
                        {!isSubmitted && (
                          <div className="pl-6 pt-1 flex justify-end">
                            <button
                              type="button"
                              disabled={selectedOpt === undefined}
                              onClick={() => handleSubmitAnswer(qIdx)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide bg-cyan-600 hover:bg-cyan-500 text-cyan-100 disabled:opacity-30 disabled:hover:bg-cyan-600 flex items-center gap-1 shadow transition"
                            >
                              <span>Submit Answer</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Feedback & Explanation */}
                        {isSubmitted && (
                          <div
                            className={cn(
                              'ml-6 p-3 rounded-lg border text-[11px] space-y-1',
                              isCorrect
                                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300/80'
                                : 'bg-red-500/5 border-red-500/10 text-red-300/80'
                            )}
                          >
                            <p className="font-semibold">{isCorrect ? 'Correct!' : 'Incorrect.'}</p>
                            <p className="text-white/60 text-[10px] leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </section>
                    );
                  })}

                  {/* Finish Block */}
                  {Object.keys(submittedQuestions).length === currentTopic.quiz.length &&
                    !quizFinished && (
                      <div className="flex justify-center pt-4">
                        <button
                          type="button"
                          onClick={handleFinishQuiz}
                          className="rounded-xl px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg transition duration-200"
                        >
                          <Award className="h-4.5 w-4.5" />
                          <span>Show Score</span>
                        </button>
                      </div>
                    )}

                  {/* Summary Score Card */}
                  {quizFinished && (
                    <div className="frost-glass-surface p-6 border border-cyan-500/20 bg-cyan-500/5 rounded-xl text-center space-y-3">
                      <Award className="h-10 w-10 text-cyan-400 mx-auto animate-bounce" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Quiz Completed!</h4>
                        <p className="text-xs text-white/50 mt-0.5">Topic: {currentTopic.title}</p>
                      </div>
                      <div className="text-2xl font-black text-cyan-300">
                        {score} / {currentTopic.quiz.length} Correct
                      </div>
                      <p className="text-[10px] text-white/40 max-w-sm mx-auto">
                        {score === currentTopic.quiz.length
                          ? 'Perfect! You have mastered this hardware privilege boundary and startup lifecycle concept.'
                          : 'Good attempt. Re-read the lesson material and try again to get a perfect score.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

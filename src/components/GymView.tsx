import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Dumbbell,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Star,
  Home,
} from 'lucide-react';
import type {
  Vibe,
  Difficulty,
  GymProtocol,
  GradingResult,
  Question,
} from '../types';
// GradingResult is also used as a type annotation in handleSubmitAnswers normalisation above
import { DIFFICULTY_DATA } from '../constants';
import { generateGymProtocol, gradeAnswers } from '../utils/ai';

interface GymViewProps {
  sourceText: string;
  persona: string;
  vibe: Vibe;
  onBack: () => void;
  onGoHome: () => void;
}

type GymPhase = 'select' | 'questions' | 'grading' | 'results';

// Fisher-Yates shuffle — returns a new shuffled array
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'MCQ',
  true_false: 'True / False',
  fill_in_blank: 'Fill in blank',
  matching: 'Matching',
  sequencing: 'Sequence',
  short_answer: 'Short answer',
};

export default function GymView({ sourceText, persona, vibe, onBack, onGoHome }: GymViewProps) {
  const [gymPhase, setGymPhase] = useState<GymPhase>('select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [protocol, setProtocol] = useState<GymProtocol | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shuffled right-side options for matching questions: { [questionId]: string[] }
  const [shuffledMatchRights, setShuffledMatchRights] = useState<Record<string, string[]>>({});
  // Current displayed order for sequencing questions: { [questionId]: string[] }
  const [seqOrders, setSeqOrders] = useState<Record<string, string[]>>({});

  // ── Start session ──────────────────────────────────────────────────────────
  const handleSelectDifficulty = async (diff: Difficulty) => {
    setDifficulty(diff);
    setIsLoading(true);
    setError(null);
    try {
      const p = await generateGymProtocol(sourceText, persona, diff);
      if (!Array.isArray(p.questions) || p.questions.length === 0) {
        throw new Error('No questions were generated. Please try again.');
      }

      // Pre-compute shuffles and seed sequencing answers
      const matchRights: Record<string, string[]> = {};
      const seqOrd: Record<string, string[]> = {};
      const initialAnswers: Record<string, string> = {};

      p.questions.forEach((q) => {
        if (q.type === 'matching' && q.pairs) {
          matchRights[q.id] = shuffle(q.pairs.map((pair) => pair.right));
        }
        if (q.type === 'sequencing' && q.items) {
          const shuffled = shuffle(q.items);
          seqOrd[q.id] = shuffled;
          // Pre-seed the answer so it always counts as "answered"
          initialAnswers[q.id] = JSON.stringify(shuffled);
        }
      });

      setShuffledMatchRights(matchRights);
      setSeqOrders(seqOrd);
      setProtocol(p);
      setAnswers(initialAnswers);
      setGymPhase('questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmitAnswers = async () => {
    if (!protocol) return;
    setGymPhase('grading');
    setIsLoading(true);
    setError(null);
    try {
      const raw = await gradeAnswers(
        protocol.questions,
        answers,
        sourceText,
        persona,
        difficulty!
      );

      // Normalize AI-returned fields to safe primitives before they touch
      // the renderer. Gemini occasionally returns objects/arrays where strings
      // are expected, which causes a silent React render crash (blank page).
      const result: GradingResult = {
        overallAssessment: String(raw?.overallAssessment ?? 'Assessment unavailable.'),
        questionFeedback: Array.isArray(raw?.questionFeedback)
          ? raw.questionFeedback.map((fb) => ({
              questionId: String(fb?.questionId ?? ''),
              isCorrect: Boolean(fb?.isCorrect),
              correctAnswer: String(fb?.correctAnswer ?? '—'),
              explanation: String(fb?.explanation ?? ''),
            }))
          : [],
      };

      setGradingResult(result);
      setGymPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grade answers. Please try again.');
      setGymPhase('questions');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setGymPhase('select');
    setDifficulty(null);
    setProtocol(null);
    setAnswers({});
    setGradingResult(null);
    setError(null);
    setShuffledMatchRights({});
    setSeqOrders({});
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getMatchAnswer = (qId: string): Record<string, string> => {
    try { return JSON.parse(answers[qId] || '{}'); } catch { return {}; }
  };

  const formatAnswerForDisplay = (q: Question, rawAnswer: string): string => {
    if (!rawAnswer) return '(no answer)';
    if (q.type === 'matching') {
      try {
        const parsed = JSON.parse(rawAnswer) as Record<string, string>;
        return Object.entries(parsed).map(([l, r]) => `${l} → ${r}`).join(' · ');
      } catch { return rawAnswer; }
    }
    if (q.type === 'sequencing') {
      try {
        const parsed = JSON.parse(rawAnswer) as string[];
        return parsed.map((item, i) => `${i + 1}. ${item}`).join(' → ');
      } catch { return rawAnswer; }
    }
    return rawAnswer;
  };

  const moveSeqItem = (qId: string, idx: number, dir: -1 | 1) => {
    const current = [...(seqOrders[qId] || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= current.length) return;
    [current[idx], current[newIdx]] = [current[newIdx], current[idx]];
    setSeqOrders((prev) => ({ ...prev, [qId]: current }));
    setAnswers((prev) => ({ ...prev, [qId]: JSON.stringify(current) }));
  };

  // Count answered questions (type-aware)
  const answeredCount = protocol
    ? protocol.questions.filter((q) => {
        const answer = answers[q.id] || '';
        if (q.type === 'matching' && q.pairs) {
          try {
            const parsed = JSON.parse(answer) as Record<string, string>;
            return q.pairs.every((p) => parsed[p.left]?.trim());
          } catch { return false; }
        }
        if (q.type === 'sequencing') return !!answer; // always pre-seeded
        return answer.trim().length > 0;
      }).length
    : 0;

  const questions = protocol?.questions ?? [];
  const feedback = gradingResult?.questionFeedback ?? [];
  const correctCount = feedback.filter((f) => f.isCorrect).length;
  const scorePercent = feedback.length > 0 ? Math.round((correctCount / feedback.length) * 100) : 0;

  const personaEmoji = '🎭';
  const personaDisplay = persona.length > 40 ? persona.slice(0, 37) + '…' : persona;
  const isIrate = difficulty === 'irate_boss';
  const bgClass = vibe === 'AVANT_GARDE' ? 'bg-black' : 'bg-gray-950';

  return (
    <div className={`min-h-screen ${bgClass} text-white`}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onGoHome}
            title="Back to home — start a new document"
            className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Masterpiece
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <Dumbbell className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium text-gray-300">The Gym</span>
            <span className="text-gray-600">·</span>
            <span className="text-sm text-gray-400">{personaEmoji} {personaDisplay}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-red-950/40 border border-red-700/50 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ── Phase: Select ──────────────────────────────────────────── */}
          {gymPhase === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <Dumbbell className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  {isLoading ? 'Preparing Your Interrogation…' : 'Enter the Gym'}
                </h1>
                <p className="text-gray-400 text-lg font-light max-w-xl mx-auto">
                  The AI will interrogate you on the material. Choose your difficulty. There is no mercy.
                </p>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                  <p className="text-gray-400 text-sm">Crafting your interrogation protocol…</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(Object.keys(DIFFICULTY_DATA) as Difficulty[]).map((diff) => {
                    const data = DIFFICULTY_DATA[diff];
                    const colorMap: Record<string, string> = {
                      emerald: 'hover:border-emerald-500 hover:bg-emerald-950/30',
                      blue: 'hover:border-blue-500 hover:bg-blue-950/30',
                      violet: 'hover:border-violet-500 hover:bg-violet-950/30',
                      rose: 'hover:border-rose-500 hover:bg-rose-950/30',
                    };
                    return (
                      <motion.button
                        key={diff}
                        onClick={() => handleSelectDifficulty(diff)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group text-left p-6 rounded-2xl border border-gray-800 bg-gray-900 transition-all ${colorMap[data.color]}`}
                      >
                        <div className="text-3xl mb-3">{data.icon}</div>
                        <h3 className="text-white font-semibold text-lg mb-1">{data.name}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{data.description}</p>
                        {diff === 'irate_boss' && (
                          <p className="text-rose-400 text-xs mt-3 font-medium">
                            ⚠️ Not recommended for the faint-hearted
                          </p>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Phase: Questions ───────────────────────────────────────── */}
          {gymPhase === 'questions' && protocol && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {isIrate ? '⚡ INTERROGATION IN PROGRESS ⚡' : 'Comprehension Challenge'}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {DIFFICULTY_DATA[difficulty!].name} · {questions.length} questions ·{' '}
                    {answeredCount}/{questions.length} answered
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-gray-800 rounded-full mb-8 overflow-hidden">
                <motion.div
                  animate={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {questions.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className={`bg-gray-900 rounded-2xl p-6 border ${
                      isIrate ? 'border-rose-800/40' : 'border-gray-800'
                    }`}
                  >
                    {/* Question header */}
                    <div className="flex items-start gap-4 mb-4">
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isIrate ? 'bg-rose-800 text-rose-200' : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        {/* Type badge */}
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 mb-2">
                          {TYPE_LABELS[q.type] ?? q.type}
                        </span>
                        <div className="text-sm text-gray-200 leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-3">
                                  <table className="w-full border-collapse text-xs">{children}</table>
                                </div>
                              ),
                              th: ({ children }) => (
                                <th className="bg-gray-700 text-gray-200 px-3 py-2 text-left border border-gray-600 text-xs">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="border border-gray-700 px-3 py-2 text-gray-300 text-xs">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {q.question}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {/* ── Multiple Choice ── */}
                    {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                      <div className="space-y-2 ml-11">
                        {q.options.map((option, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                              answers[q.id] === option
                                ? isIrate
                                  ? 'bg-rose-900/50 border-rose-500 text-rose-200'
                                  : 'bg-indigo-900/50 border-indigo-500 text-indigo-200'
                                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── True / False ── */}
                    {q.type === 'true_false' && (
                      <div className="flex gap-3 ml-11">
                        {['True', 'False'].map((option) => (
                          <button
                            key={option}
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                              answers[q.id] === option
                                ? option === 'True'
                                  ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300'
                                  : 'bg-red-900/50 border-red-500 text-red-300'
                                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Fill in Blank ── */}
                    {q.type === 'fill_in_blank' && (
                      <div className="ml-11">
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={isIrate ? 'Answer. Now.' : 'Fill in the blank…'}
                          className={`w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none ${
                            isIrate
                              ? 'bg-gray-800 border border-rose-800/50 text-gray-200 placeholder-rose-900/60 focus:border-rose-600'
                              : 'bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-600'
                          }`}
                        />
                      </div>
                    )}

                    {/* ── Matching ── */}
                    {q.type === 'matching' && q.pairs && (
                      <div className="ml-11 space-y-2">
                        <p className="text-xs text-gray-500 mb-3">
                          Match each item on the left to the correct item on the right.
                        </p>
                        {q.pairs.map((pair) => {
                          const matchAns = getMatchAnswer(q.id);
                          return (
                            <div key={pair.left} className="flex items-center gap-2">
                              <div className="flex-1 px-3 py-2.5 bg-gray-800/70 rounded-lg text-sm text-gray-300 border border-gray-700 min-w-0">
                                {pair.left}
                              </div>
                              <span className="text-gray-600 text-sm flex-shrink-0">→</span>
                              <select
                                value={matchAns[pair.left] || ''}
                                onChange={(e) => {
                                  const updated = { ...getMatchAnswer(q.id), [pair.left]: e.target.value };
                                  setAnswers((prev) => ({ ...prev, [q.id]: JSON.stringify(updated) }));
                                }}
                                className={`flex-1 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-800 border min-w-0 ${
                                  matchAns[pair.left]
                                    ? isIrate
                                      ? 'border-rose-700 text-gray-200'
                                      : 'border-indigo-600 text-gray-200'
                                    : 'border-gray-700 text-gray-500'
                                }`}
                              >
                                <option value="">— Select —</option>
                                {(shuffledMatchRights[q.id] || []).map((right, i) => (
                                  <option key={i} value={right}>{right}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Sequencing ── */}
                    {q.type === 'sequencing' && q.items && (
                      <div className="ml-11 space-y-2">
                        <p className="text-xs text-gray-500 mb-3">
                          Use the arrows to arrange these items in the correct order.
                        </p>
                        {(seqOrders[q.id] || q.items).map((item, idx, arr) => (
                          <div key={item} className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs w-5 text-right flex-shrink-0">{idx + 1}.</span>
                            <div className="flex-1 px-3 py-2.5 bg-gray-800/70 rounded-lg text-sm text-gray-300 border border-gray-700">
                              {item}
                            </div>
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                disabled={idx === 0}
                                onClick={() => moveSeqItem(q.id, idx, -1)}
                                className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed p-0.5 transition-colors"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={idx === arr.length - 1}
                                onClick={() => moveSeqItem(q.id, idx, 1)}
                                className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed p-0.5 transition-colors"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Short Answer ── */}
                    {q.type === 'short_answer' && (
                      <div className="ml-11">
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={isIrate ? 'Answer NOW. Do not waste my time.' : 'Type your answer here… (2–4 sentences)'}
                          rows={3}
                          className={`w-full rounded-xl p-4 text-sm resize-none transition-all focus:outline-none ${
                            isIrate
                              ? 'bg-gray-800 border border-rose-800/50 text-gray-200 placeholder-rose-900/60 focus:border-rose-600'
                              : 'bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-600'
                          }`}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-10 flex flex-col items-center gap-3"
              >
                <button
                  onClick={handleSubmitAnswers}
                  disabled={answeredCount === 0}
                  className={`px-10 py-4 rounded-2xl font-semibold text-base transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed ${
                    isIrate
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/30'
                  }`}
                >
                  {isIrate ? 'Submit — If You Dare' : `Submit Answers (${answeredCount}/${questions.length})`}
                </button>
                {answeredCount < questions.length && (
                  <p className="text-gray-600 text-xs">
                    {questions.length - answeredCount} question(s) unanswered — you can still submit
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── Phase: Grading ─────────────────────────────────────────── */}
          {gymPhase === 'grading' && (
            <motion.div
              key="grading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-6"
            >
              <Loader2 className="w-12 h-12 text-rose-400 animate-spin" />
              <div className="text-center">
                <p className="text-white text-xl font-semibold mb-2">
                  {isIrate ? 'The Boss is reviewing your pitiful attempt…' : 'Grading your answers…'}
                </p>
                <p className="text-gray-400 text-sm">
                  {personaDisplay} is evaluating your comprehension
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Phase: Results ─────────────────────────────────────────── */}
          {gymPhase === 'results' && gradingResult && protocol && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Score header */}
              <div
                className={`rounded-3xl p-8 mb-8 text-center border ${
                  scorePercent >= 70
                    ? 'bg-emerald-950/30 border-emerald-700/50'
                    : scorePercent >= 40
                    ? 'bg-yellow-950/30 border-yellow-700/50'
                    : isIrate
                    ? 'bg-rose-950/40 border-rose-700/60'
                    : 'bg-red-950/30 border-red-700/50'
                }`}
              >
                <div className="text-6xl font-black mb-2 text-white">{scorePercent}%</div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {scorePercent >= 70 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span className={`font-semibold ${scorePercent >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {correctCount}/{feedback.length} correct
                  </span>
                </div>

                {/* Overall assessment */}
                <div
                  className={`mt-4 p-4 rounded-xl text-left text-sm leading-relaxed ${
                    isIrate ? 'bg-black/30 text-rose-200 font-mono' : 'bg-black/20 text-gray-200'
                  }`}
                >
                  <p className="text-xs uppercase tracking-widest mb-2 opacity-60">
                    {personaEmoji} {personaDisplay} says:
                  </p>
                  <p className={isIrate ? 'text-rose-100' : 'text-gray-100'}>
                    {gradingResult.overallAssessment}
                  </p>
                </div>
              </div>

              {/* Per-question breakdown */}
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Question Breakdown
              </h3>

              <div className="space-y-4">
                {protocol.questions.map((q, idx) => {
                  const fb = feedback.find((f) => f.questionId === q.id);
                  const isCorrect = fb?.isCorrect ?? false;
                  const userAnswerDisplay = formatAnswerForDisplay(q, answers[q.id] || '');

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`rounded-2xl p-5 border ${
                        isCorrect
                          ? 'bg-emerald-950/20 border-emerald-800/50'
                          : 'bg-red-950/20 border-red-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-xs text-gray-400">Question {idx + 1}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                              {TYPE_LABELS[q.type] ?? q.type}
                            </span>
                          </div>

                          {/* Question text */}
                          <div className="text-sm text-gray-200 mb-3 leading-relaxed">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {q.question}
                            </ReactMarkdown>
                          </div>

                          {/* User's answer */}
                          <div className="mb-1.5 text-xs">
                            <span className="text-gray-500 font-medium">Your answer: </span>
                            <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                              {userAnswerDisplay}
                            </span>
                          </div>

                          {/* Correct answer — ALWAYS shown */}
                          <div className="mb-3 text-xs">
                            <span className="text-gray-500 font-medium">Correct answer: </span>
                            <span className="text-yellow-300 font-medium">
                              {fb?.correctAnswer ?? '—'}
                            </span>
                          </div>

                          {/* Explanation */}
                          {fb && (
                            <div
                              className={`text-sm p-3 rounded-xl leading-relaxed ${
                                isCorrect
                                  ? 'bg-emerald-900/30 text-emerald-200'
                                  : 'bg-red-900/30 text-red-200'
                              }`}
                            >
                              {fb.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-sm transition-all"
                >
                  Try Different Difficulty
                </button>
                <button
                  onClick={onBack}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
                >
                  Return to Masterpiece
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

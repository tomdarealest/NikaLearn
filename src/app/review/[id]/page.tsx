'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader,
  AlertCircle,
  Volume2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Star,
  ChevronRight,
  ClipboardList,
  PenLine,
  Eye,
  Layers,
  Award,
} from 'lucide-react';
import PageContainer from '@/components/PageContainer';

interface ReviewTopic {
  id: string;
  title: string;
  description: string | null;
  toeic_level: string;
}

interface Flashcard {
  id: string;
  word: string;
  meaning_vi: string;
  ipa: string;
  example_en: string;
  fill_blank: string;
  fill_answer: string;
  sort_order: number;
}

type CardRating = 'remembered' | 'not_yet' | 'difficult';

interface SessionResult {
  cardId: string;
  userAnswer: string;
  isCorrect: boolean;
  rating: CardRating;
}

type ReviewFilter = 'all' | 'correct' | 'incorrect' | 'difficult';

const FLIP_DURATION_MS = 650;

function normalizeAnswer(text: string) {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

function ratingLabel(rating: CardRating) {
  if (rating === 'remembered') return 'Đã nhớ';
  if (rating === 'difficult') return 'Khó nhớ';
  return 'Chưa nhớ';
}

const LEVEL_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  beginner: {
    label: 'TOEIC 350-500',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/70',
  },
  intermediate: {
    label: 'TOEIC 500-750',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/70',
  },
  advanced: {
    label: 'TOEIC 750+',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/70',
  },
};

/**
 * Render blank sentence with styled slot on front, or highlighted word on back
 */
function renderSentenceContent(sentence: string, highlightWord?: string) {
  if (!sentence) return null;

  if (highlightWord) {
    const escaped = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, idx) =>
      part.toLowerCase() === highlightWord.toLowerCase() ? (
        <span
          key={idx}
          className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md underline decoration-emerald-500/60 decoration-2 underline-offset-4"
        >
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  }

  // Front of card: replace underscores ____ with a sleek pill slot
  const parts = sentence.split(/(_{2,})/);
  return parts.map((part, idx) => {
    if (/^_{2,}$/.test(part)) {
      return (
        <span
          key={idx}
          className="inline-flex items-center justify-center px-3 py-0.5 mx-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border-2 border-dashed border-emerald-400/80 dark:border-emerald-600/80 text-sm tracking-wider shadow-xs align-middle"
        >
          [ &nbsp;?&nbsp; ]
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function ReviewStudyPage() {
  const params = useParams();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<ReviewTopic | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showReviewSummary, setShowReviewSummary] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  const inputRef = useRef<HTMLInputElement>(null);
  const storageKey = `nikalearn-review-${topicId}`;

  const fetchTopic = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/review-topics/${topicId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được bộ ôn tập');
      }
      setTopic(data.data.topic);
      setCards(data.data.cards || []);
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    // Ensure page always starts at top on initial load / reload
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    }
    if (topicId) fetchTopic();
  }, [topicId, fetchTopic]);

  const card = cards[index];

  // Auto focus input whenever index changes and not flipped (with preventScroll: true to avoid jumping)
  useEffect(() => {
    if (!flipped && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [index, flipped]);

  const stats = useMemo(() => {
    const correct = sessionResults.filter((r) => r.isCorrect).length;
    const incorrect = sessionResults.filter((r) => !r.isCorrect).length;
    const remembered = sessionResults.filter((r) => r.rating === 'remembered').length;
    const difficult = sessionResults.filter((r) => r.rating === 'difficult').length;
    const accuracy = sessionResults.length
      ? Math.round((correct / sessionResults.length) * 100)
      : 0;
    return { correct, incorrect, remembered, difficult, accuracy, total: sessionResults.length };
  }, [sessionResults]);

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const filteredResults = useMemo(() => {
    if (reviewFilter === 'correct') return sessionResults.filter((r) => r.isCorrect);
    if (reviewFilter === 'incorrect') return sessionResults.filter((r) => !r.isCorrect);
    if (reviewFilter === 'difficult') return sessionResults.filter((r) => r.rating === 'difficult');
    return sessionResults;
  }, [sessionResults, reviewFilter]);

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      setIsPlayingAudio(true);
      u.onend = () => setIsPlayingAudio(false);
      u.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(u);
    }
  }, []);

  const handleCheck = useCallback(() => {
    if (!card) return;
    const target = card.fill_answer || card.word;
    const ok =
      normalizeAnswer(answer) === normalizeAnswer(target) ||
      normalizeAnswer(answer) === normalizeAnswer(card.word);
    setIsCorrect(ok);
    setChecked(true);
    setFlipped(true);
  }, [card, answer]);

  const handlePeekAnswer = useCallback(() => {
    if (!card) return;
    setIsCorrect(false);
    setChecked(true);
    setFlipped(true);
  }, [card]);

  const handleNext = useCallback(
    (rating: CardRating) => {
      if (!card) return;

      const result: SessionResult = {
        cardId: card.id,
        userAnswer: answer.trim(),
        isCorrect,
        rating,
      };

      const nextResults = [...sessionResults, result];
      setSessionResults(nextResults);

      if (index < cards.length - 1) {
        setFlipped(false);
        window.setTimeout(() => {
          setIndex((i) => i + 1);
          setAnswer('');
          setChecked(false);
          setIsCorrect(false);
        }, FLIP_DURATION_MS);
      } else {
        setSessionComplete(true);
        localStorage.setItem(
          `${storageKey}-session`,
          JSON.stringify({ completedAt: new Date().toISOString(), results: nextResults })
        );
      }
    },
    [card, answer, isCorrect, sessionResults, index, cards.length, storageKey]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!flipped) {
        if (e.key === 'Enter' && answer.trim() && !checked) {
          e.preventDefault();
          handleCheck();
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          handleNext('remembered');
        } else if (e.key === '2') {
          e.preventDefault();
          handleNext('not_yet');
        } else if (e.key === '3') {
          e.preventDefault();
          handleNext('difficult');
        } else if (e.key === ' ' || e.key === 'AudioVolumeUp') {
          e.preventDefault();
          if (card) speak(card.word);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipped, answer, checked, card, handleCheck, handleNext, speak]);

  const resetSession = () => {
    setIndex(0);
    setFlipped(false);
    setAnswer('');
    setChecked(false);
    setIsCorrect(false);
    setSessionResults([]);
    setSessionComplete(false);
    setShowReviewSummary(false);
    setReviewFilter('all');
    localStorage.removeItem(`${storageKey}-session`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-9 h-9 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải bộ ôn tập...</p>
        </div>
      </div>
    );
  }

  if (error || !topic || cards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-20">
        <PageContainer size="sm" className="text-center">
          <div className="max-w-md mx-auto p-8 rounded-3xl border border-border bg-card shadow-sm">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Chưa thể tải dữ liệu</h2>
            <p className="text-sm text-muted-foreground mb-6">{error || 'Không tìm thấy bộ flashcard ôn tập nào.'}</p>
            <Link
              href="/review"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  /* ── Review summary screen ── */
  if (showReviewSummary) {
    return (
      <div className="bg-background min-h-screen pb-20">
        <PageContainer size="md" className="py-8 sm:py-12">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setShowReviewSummary(false)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại phiên học
            </button>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Tổng kết kết quả ôn tập</h1>
              <p className="text-sm text-muted-foreground mt-1">Bộ chủ đề: <strong className="text-foreground">{topic.title}</strong></p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Độ chính xác', value: `${stats.accuracy}%`, color: 'text-emerald-600' },
                { label: 'Đúng', value: stats.correct, color: 'text-emerald-600' },
                { label: 'Chưa đúng', value: stats.incorrect, color: 'text-rose-600' },
                { label: 'Cần ôn lại', value: stats.difficult, color: 'text-amber-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/80 bg-card p-4 text-center shadow-xs">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {(
                [
                  { id: 'all', label: `Tất cả (${stats.total})` },
                  { id: 'correct', label: `Đúng (${stats.correct})` },
                  { id: 'incorrect', label: `Sai (${stats.incorrect})` },
                  { id: 'difficult', label: `Khó nhớ (${stats.difficult})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReviewFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    reviewFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredResults.map((result, i) => {
                const c = cardMap.get(result.cardId);
                if (!c) return null;
                return (
                  <div
                    key={result.cardId}
                    className={`rounded-2xl border p-4.5 transition-colors ${
                      result.isCorrect
                        ? 'border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-rose-200/80 bg-rose-50/30 dark:bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {result.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <span className="font-bold text-base text-foreground capitalize">
                          #{i + 1} {c.word}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">/{c.ipa}/</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
                        {ratingLabel(result.rating)}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                      {c.meaning_vi}
                    </p>

                    {!result.isCorrect && (
                      <div className="p-2.5 rounded-xl bg-card border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1 mb-2">
                        <p className="text-rose-600 dark:text-rose-400">
                          Bạn đã trả lời: <strong>{result.userAnswer || '(bỏ trống)'}</strong>
                        </p>
                        <p className="text-emerald-700 dark:text-emerald-300">
                          Đáp án đúng: <strong>{c.fill_answer || c.word}</strong>
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      {renderSentenceContent(c.example_en, c.fill_answer || c.word)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                type="button"
                onClick={resetSession}
                className="flex-1 min-w-[140px] py-3 border border-border/80 rounded-xl text-sm font-semibold hover:bg-muted/60 transition-colors"
              >
                Ôn tập lại từ đầu
              </button>
              <Link
                href="/review"
                className="flex-1 min-w-[140px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-center rounded-xl text-sm font-semibold transition-colors shadow-xs"
              >
                Quay về danh sách
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  /* ── Session complete screen ── */
  if (sessionComplete) {
    return (
      <div className="bg-background min-h-screen pb-20 flex items-center justify-center">
        <PageContainer size="sm" className="py-10">
          <div className="max-w-lg mx-auto text-center p-8 sm:p-10 rounded-3xl bg-card border border-border/80 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">
              Hoàn thành phiên ôn tập!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Bạn đã hoàn thành toàn bộ {cards.length} thẻ từ vựng chủ đề <strong>{topic.title}</strong>
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-8">
              <div className="p-3 rounded-2xl bg-muted/60">
                <p className="text-2xl font-black text-emerald-600">{stats.accuracy}%</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Chính xác</p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/60">
                <p className="text-2xl font-black text-emerald-600">{stats.remembered}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Đã nhớ</p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/60">
                <p className="text-2xl font-black text-amber-600">{stats.difficult}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Cần ôn lại</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowReviewSummary(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-xs"
              >
                <ClipboardList className="w-4 h-4" />
                Xem lại đáp án
              </button>
              <button
                type="button"
                onClick={resetSession}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/80 hover:bg-muted/50 font-semibold rounded-xl text-sm transition-colors text-foreground"
              >
                <RotateCcw className="w-4 h-4" />
                Luyện tập lại
              </button>
              <Link
                href="/review"
                className="inline-flex items-center justify-center gap-1 px-4 py-3 text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors"
              >
                Danh sách
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!card) return null;

  const levelInfo = LEVEL_CONFIG[topic.toeic_level] || {
    label: topic.toeic_level.toUpperCase(),
    badgeClass: 'bg-muted text-muted-foreground border-border/60',
  };

  const progressPct = ((index + 1) / cards.length) * 100;

  return (
    <div className="bg-gradient-to-b from-muted/30 via-background to-background min-h-screen pb-20">
      <PageContainer size="md" className="py-6 sm:py-8">
        <div className="max-w-xl sm:max-w-2xl mx-auto w-full">
          {/* Top navigation row */}
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/review"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Danh sách ôn tập</span>
            </Link>

            <button
              type="button"
              onClick={resetSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Làm lại từ thẻ đầu tiên"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          </div>

          {/* Topic header & stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${levelInfo.badgeClass}`}>
                  {levelInfo.label}
                </span>
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {cards.length} thẻ
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {topic.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-xl bg-card border border-border/70 shadow-xs text-foreground">
                Thẻ <strong className="text-emerald-600">{index + 1}</strong> / {cards.length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đúng: {stats.correct}/{sessionResults.length}
              </span>
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="relative h-2 w-full bg-muted rounded-full mb-6 overflow-hidden p-0.5 border border-border/30">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* 3D Flashcard container */}
          <div className="flashcard-scene mb-5" key={card.id}>
            <div className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
              {/* FRONT FACE */}
              <div className="flashcard-face flashcard-front">
                {/* Header inside card */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                    <PenLine className="w-3.5 h-3.5" />
                    <span>ĐIỀN TỪ VÀO CHỖ TRỐNG</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => speak(card.word)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isPlayingAudio
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-muted/80 hover:bg-muted text-foreground'
                    }`}
                    title="Nghe phát âm từ vựng"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isPlayingAudio ? 'Đang phát...' : 'Phát âm'}</span>
                  </button>
                </div>

                {/* Sentence Prompt */}
                <div className="my-auto py-4">
                  <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80 mb-2">
                    Hoàn thành câu tiếng Anh:
                  </p>
                  <p className="text-lg sm:text-xl text-foreground font-medium leading-relaxed">
                    {renderSentenceContent(card.fill_blank || card.example_en)}
                  </p>
                </div>

                {/* Input Area */}
                <div className="mt-auto space-y-3 pt-4 border-t border-border/40">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (answer.trim()) handleCheck();
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Nhập từ vựng tiếng Anh vào đây..."
                      className="flex-1 px-4 py-3 bg-muted/40 surface-input rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-border/70"
                    />
                    <button
                      type="submit"
                      disabled={!answer.trim()}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span>Kiểm tra đáp án</span>
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-700/60 text-[10px] font-mono">↵</kbd>
                    </button>
                  </form>

                  <div className="flex items-center justify-end text-xs text-muted-foreground pt-1">
                    <button
                      type="button"
                      onClick={handlePeekAnswer}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem đáp án (bỏ qua)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BACK FACE */}
              <div className="flashcard-face flashcard-back">
                {/* Result Status Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>CHÍNH XÁC!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>CHƯA CHÍNH XÁC</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => speak(card.word)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all"
                    title="Nghe lại phát âm"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Phát âm (Space)</span>
                  </button>
                </div>

                {/* Target Word & Phonetics */}
                <div className="flex-1 flex flex-col justify-center py-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground capitalize tracking-tight">
                      {card.word}
                    </h3>
                    {card.ipa && (
                      <span className="text-xs sm:text-sm font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">
                        /{card.ipa}/
                      </span>
                    )}
                  </div>

                  <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {card.meaning_vi}
                  </p>

                  {/* Comparison box if incorrect */}
                  {!isCorrect && (
                    <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 text-xs sm:text-sm space-y-0.5">
                      <p className="text-rose-700 dark:text-rose-300">
                        Bạn đã nhập: <strong className="font-semibold underline">{answer.trim() || '(bỏ trống)'}</strong>
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-300">
                        Đáp án đúng: <strong className="font-bold">{card.fill_answer || card.word}</strong>
                      </p>
                    </div>
                  )}

                  {/* Full example sentence */}
                  <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                    <p className="text-[10px] sm:text-[11px] font-bold not-italic uppercase tracking-wider text-muted-foreground mb-1">
                      Ví dụ ngữ cảnh:
                    </p>
                    {renderSentenceContent(card.example_en, card.fill_answer || card.word)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Action Buttons when flipped */}
          {flipped && (
            <div className="mt-5 flashcard-rating-enter space-y-2.5">
              <p className="text-center text-xs font-semibold text-muted-foreground">
                Đánh giá mức độ ghi nhớ để chuyển sang thẻ tiếp theo:
              </p>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleNext('remembered')}
                  className="group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:shadow-md transition-all font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Đã nhớ</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-800 text-[10px] font-mono text-emerald-900 dark:text-emerald-100">
                    Phím 1
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => handleNext('not_yet')}
                  className="group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:shadow-md transition-all font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>Chưa nhớ</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-rose-200/60 dark:bg-rose-800 text-[10px] font-mono text-rose-900 dark:text-rose-100">
                    Phím 2
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => handleNext('difficult')}
                  className="group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:shadow-md transition-all font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <Star className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>Khó nhớ</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800 text-[10px] font-mono text-amber-900 dark:text-amber-100">
                    Phím 3
                  </kbd>
                </button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

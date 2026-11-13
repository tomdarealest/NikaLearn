'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  FileText,
  Lightbulb,
  ChevronLeft,
  ArrowLeft,
  Volume2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PageShell from '@/components/PageShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionItem {
  id: string;
  test_id: string;
  question_number: number;
  part_number: number;
  question_text: string;
  image_url: string | null;
  audio_url: string | null;
  options: any;
  correct_option: string;
  explanation?: string;
  transcript?: string;
}

interface AttemptData {
  id?: string;
  user_id?: string;
  test_id?: string;
  user_answers: Record<string | number, string>;
  selected_parts?: number[];
  total_questions?: number;
  correct_count?: number;
  wrong_count?: number;
  skipped_count?: number;
  score?: number;
  time_taken_seconds?: number;
  created_at?: string;
}

export default function ExamResultDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const examId = (params?.id as string) || '';
  const attemptIdParam = searchParams.get('attempt_id') || '';
  const isGuestParam = searchParams.get('guest') === 'true';

  const [testTitle, setTestTitle] = useState('Đề thi TOEIC Full Test');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);

  // View mode: 'summary' (Ảnh 1) | 'review' (Ảnh 2 - Study4 style)
  const [viewMode, setViewMode] = useState<'summary' | 'review'>('summary');
  const [selectedPartTab, setSelectedPartTab] = useState<string>('Tất cả');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<string>('Tổng quát');

  // Accordion state cho review view
  const [expandAll, setExpandAll] = useState(false);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<number, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});

  // 1. Load đề thi, câu hỏi và bài làm của User
  useEffect(() => {
    const loadResultData = async () => {
      try {
        setLoading(true);

        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        let actualTestId = examId;

        // Resolve actual test id nếu param là slug
        if (supabase && !isUUID(examId)) {
          const { data: firstPublished } = await supabase
            .from('tests')
            .select('id, title')
            .eq('status', 'published')
            .limit(1)
            .single();

          if (firstPublished?.id) {
            actualTestId = firstPublished.id;
            if (firstPublished.title) setTestTitle(firstPublished.title);
          }
        }

        // Lấy title đề thi
        if (supabase && isUUID(actualTestId)) {
          const { data: tData } = await supabase
            .from('tests')
            .select('title')
            .eq('id', actualTestId)
            .single();
          if (tData?.title) setTestTitle(tData.title);
        }

        // Fetch questions
        let loadedQuestions: QuestionItem[] = [];
        if (supabase) {
          const { data: qData, error: qErr } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', actualTestId)
            .order('question_number', { ascending: true });

          if (!qErr && qData && qData.length > 0) {
            loadedQuestions = qData;
            setQuestions(qData);
          }
        }

        // Load attempt record
        let loadedAttempt: AttemptData | null = null;

        // Ưu tiên 1: Lấy từ Supabase test_attempts
        if (supabase) {
          if (attemptIdParam && attemptIdParam !== 'guest' && isUUID(attemptIdParam)) {
            const { data: attById } = await supabase
              .from('test_attempts')
              .select('*')
              .eq('id', attemptIdParam)
              .single();
            if (attById) loadedAttempt = attById;
          } else if (user?.id) {
            // Lấy lần làm bài gần nhất của user này
            const { data: attByUser } = await supabase
              .from('test_attempts')
              .select('*')
              .in('test_id', [examId, actualTestId])
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (attByUser) loadedAttempt = attByUser;
          }
        }

        // Ưu tiên 2: Fallback đọc từ LocalStorage theo đúng account
        if (!loadedAttempt) {
          try {
            if (user?.id) {
              const cached = localStorage.getItem(`toeic_attempt_${user.id}_${examId}`) ||
                             localStorage.getItem(`toeic_attempt_${user.id}_${actualTestId}`);
              if (cached) loadedAttempt = JSON.parse(cached);
            } else if (isGuestParam || !user?.id) {
              const guestCached = localStorage.getItem(`toeic_attempt_guest_${examId}`) ||
                                  localStorage.getItem(`toeic_attempt_guest_${actualTestId}`);
              if (guestCached) loadedAttempt = JSON.parse(guestCached);
            }
          } catch (e) {
            console.warn('LocalStorage attempt load error:', e);
          }
        }

        // Nếu vẫn không có bài làm, tạo mock rỗng dựa trên danh sách câu hỏi
        if (!loadedAttempt) {
          loadedAttempt = {
            id: attemptIdParam || 'empty',
            user_answers: {},
            selected_parts: [1, 2, 3, 4, 5, 6, 7],
            total_questions: loadedQuestions.length || 200,
            correct_count: 0,
            wrong_count: 0,
            skipped_count: loadedQuestions.length || 200,
            score: 0,
            time_taken_seconds: 120,
          };
        }

        setAttempt(loadedAttempt);
      } catch (err) {
        console.error('Lỗi khi tải kết quả đề thi:', err);
      } finally {
        setLoading(false);
      }
    };

    loadResultData();
  }, [examId, attemptIdParam, isGuestParam, user?.id]);

  // 2. Tính toán số liệu thống kê chi tiết theo từng câu hỏi
  const computedStats = useMemo(() => {
    const userAnswers = attempt?.user_answers || {};
    const totalQ = questions.length || 200;

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    // Chi tiết từng câu
    const questionStatusList = questions.map((q) => {
      const uAns = (userAnswers[q.question_number] || userAnswers[String(q.question_number)] || '').trim().toUpperCase();
      const cAns = (q.correct_option || 'A').trim().toUpperCase();

      const isAnswered = Boolean(uAns);
      const isCorrect = isAnswered && uAns === cAns;
      const isWrong = isAnswered && uAns !== cAns;
      const isSkipped = !isAnswered;

      if (isCorrect) correct++;
      else if (isWrong) wrong++;
      else skipped++;

      return {
        q: q.question_number,
        part: q.part_number,
        userAns: uAns,
        correctAns: cAns,
        isCorrect,
        isWrong,
        isSkipped,
        statusText: isCorrect ? 'Đúng' : isWrong ? 'Sai' : 'chưa trả lời',
      };
    });

    const accuracy = totalQ > 0 ? ((correct / totalQ) * 100).toFixed(1) : '0.0';

    // Nhóm theo Part (1 -> 7)
    const partStatsMap: Record<number, {
      part: number;
      correct: number;
      wrong: number;
      skipped: number;
      total: number;
      accuracy: string;
      questions: number[];
    }> = {};

    for (let p = 1; p <= 7; p++) {
      partStatsMap[p] = {
        part: p,
        correct: 0,
        wrong: 0,
        skipped: 0,
        total: 0,
        accuracy: '0.00%',
        questions: [],
      };
    }

    questionStatusList.forEach((item) => {
      const p = item.part || 1;
      if (!partStatsMap[p]) {
        partStatsMap[p] = {
          part: p,
          correct: 0,
          wrong: 0,
          skipped: 0,
          total: 0,
          accuracy: '0.00%',
          questions: [],
        };
      }
      partStatsMap[p].total++;
      partStatsMap[p].questions.push(item.q);
      if (item.isCorrect) partStatsMap[p].correct++;
      else if (item.isWrong) partStatsMap[p].wrong++;
      else partStatsMap[p].skipped++;
    });

    Object.values(partStatsMap).forEach((st) => {
      st.accuracy = st.total > 0 ? `${((st.correct / st.total) * 100).toFixed(2)}%` : '0.00%';
    });

    return {
      totalQuestions: totalQ,
      correctCount: attempt?.correct_count !== undefined ? attempt.correct_count : correct,
      wrongCount: attempt?.wrong_count !== undefined ? attempt.wrong_count : wrong,
      skippedCount: attempt?.skipped_count !== undefined ? attempt.skipped_count : skipped,
      accuracy,
      timeTaken: attempt?.time_taken_seconds || 120,
      questionStatusList,
      partStatsMap,
    };
  }, [questions, attempt]);

  // Format thời gian hiển thị (H:MM:SS)
  const formatTimeTaken = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Mở màn hình đáp án chi tiết và cuộn mượt đến câu hỏi tương ứng
  const handleOpenQuestionReview = (qNum: number) => {
    const targetQ = questions.find((q) => q.question_number === qNum);
    const partNum = targetQ?.part_number || 1;

    setSelectedPartTab(`Part ${partNum}`);
    setExpandedTranscripts((prev) => ({ ...prev, [qNum]: true }));
    setExpandedExplanations((prev) => ({ ...prev, [qNum]: true }));
    setViewMode('review');

    setTimeout(() => {
      const el = document.getElementById(`question-review-${qNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Mở toàn bộ bài xem chi tiết
  const handleOpenFullReview = () => {
    setSelectedPartTab('Tất cả');
    setViewMode('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle toàn bộ transcript và explanation
  const handleToggleExpandAll = () => {
    const nextState = !expandAll;
    setExpandAll(nextState);

    const newTrans: Record<number, boolean> = {};
    const newExpl: Record<number, boolean> = {};
    questions.forEach((q) => {
      newTrans[q.question_number] = nextState;
      newExpl[q.question_number] = nextState;
    });
    setExpandedTranscripts(newTrans);
    setExpandedExplanations(newExpl);
  };

  // Toggle transcript từng câu
  const toggleTranscript = (qNum: number) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [qNum]: !prev[qNum],
    }));
  };

  // Toggle explanation từng câu
  const toggleExplanation = (qNum: number) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [qNum]: !prev[qNum],
    }));
  };

  // Format transcript đoạn nghe chuẩn Study4 (tự động ngắt dòng giữa các đáp án A-B-C-D)
  const formatTranscript = (text?: string | null) => {
    if (!text) return '';
    return text
      .replace(/([^\n])\s*(\([A-D]\))/gi, '$1\n\n$2')
      .replace(/([^\n])\s*([A-D]\.\s+)/g, '$1\n\n$2')
      .trim();
  };

  // Danh sách câu hỏi hiển thị ở cột trái theo Tab Part đã chọn
  const filteredReviewQuestions = useMemo(() => {
    if (selectedPartTab === 'Tất cả') return questions;
    const match = selectedPartTab.match(/Part\s*(\d+)/i);
    if (!match) return questions;
    const partNum = parseInt(match[1], 10);
    return questions.filter((q) => q.part_number === partNum);
  }, [questions, selectedPartTab]);

  if (loading) {
    return (
      <PageShell className="pb-20 bg-background min-h-screen">
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#2b4c7e] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">
            Đang tải dữ liệu kết quả bài thi...
          </p>
        </div>
      </PageShell>
    );
  }

  // =========================================================================
  // GIAO DIỆN 1: TỔNG QUAN KẾT QUẢ (Ảnh 1)
  // =========================================================================
  if (viewMode === 'summary') {
    const userAnswers = attempt?.user_answers || {};

    return (
      <PageShell className="pb-20 bg-background min-h-screen">
        <PageContainer className="py-6 max-w-5xl">
          {/* Back Link */}
          <Link
            href={`/exam/${examId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại trang đề thi
          </Link>

          {/* 1. Header (Ảnh 1) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-border/70">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  Kết quả luyện tập: {testTitle}
                </h1>
                <div className="flex flex-wrap gap-1">
                  {(attempt?.selected_parts || [1, 2, 3, 4, 5, 6, 7]).map((p) => (
                    <span
                      key={p}
                      className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded"
                    >
                      Part {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenFullReview}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-xs transition cursor-pointer"
              >
                Xem đáp án
              </button>
              <Link
                href={`/exam/${examId}`}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-foreground font-semibold rounded-lg text-xs sm:text-sm transition"
              >
                Tới trang đề thi
              </Link>
            </div>
          </div>

          {/* 2. Overview Stat Cards (Ảnh 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Card 1: Tổng quan kết quả */}
            <div className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Check className="w-4 h-4 text-slate-500" /> Kết quả làm bài
                  </span>
                  <span className="font-bold text-foreground">
                    {computedStats.correctCount}/{computedStats.totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-slate-400" /> Độ chính xác (#đúng/#tổng)
                  </span>
                  <span className="font-bold text-foreground">
                    {computedStats.accuracy}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" /> Thời gian hoàn thành
                  </span>
                  <span className="font-bold text-foreground font-mono">
                    {formatTimeTaken(computedStats.timeTaken)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Trả lời đúng */}
            <div className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4" /> Trả lời đúng
              </div>
              <div className="text-3xl font-extrabold text-foreground my-0.5">
                {computedStats.correctCount}
              </div>
              <div className="text-xs text-muted-foreground">câu hỏi</div>
            </div>

            {/* Card 3: Trả lời sai */}
            <div className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                <XCircle className="w-4 h-4" /> Trả lời sai
              </div>
              <div className="text-3xl font-extrabold text-foreground my-0.5">
                {computedStats.wrongCount}
              </div>
              <div className="text-xs text-muted-foreground">câu hỏi</div>
            </div>

            {/* Card 4: Bỏ qua */}
            <div className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <MinusCircle className="w-4 h-4" /> Bỏ qua
              </div>
              <div className="text-3xl font-extrabold text-foreground my-0.5">
                {computedStats.skippedCount}
              </div>
              <div className="text-xs text-muted-foreground">câu hỏi</div>
            </div>
          </div>

          {/* 3. Section Phân tích chi tiết (Ảnh 1) */}
          <div className="mb-10">
            <h2 className="text-base font-bold text-foreground mb-3">
              Phân tích chi tiết
            </h2>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Tổng quát', 'Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'].map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveAnalysisTab(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      activeAnalysisTab === tab
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Table */}
            <div className="border border-border/80 rounded-xl overflow-x-auto bg-white dark:bg-[#1A2417] shadow-2xs">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 dark:bg-white/5 text-muted-foreground font-semibold border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Phân loại câu hỏi</th>
                    <th className="py-3 px-4 text-center">Số câu đúng</th>
                    <th className="py-3 px-4 text-center">Số câu sai</th>
                    <th className="py-3 px-4 text-center">Số câu bỏ qua</th>
                    <th className="py-3 px-4 text-center">Độ chính xác</th>
                    <th className="py-3 px-4">Danh sách câu hỏi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {Object.values(computedStats.partStatsMap)
                    .filter((row) => {
                      if (activeAnalysisTab === 'Tổng quát') return row.total > 0;
                      return `Part ${row.part}` === activeAnalysisTab;
                    })
                    .map((row) => (
                      <tr key={row.part} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          [Part {row.part}] TOEIC Part {row.part}
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-600 font-bold">{row.correct}</td>
                        <td className="py-3 px-4 text-center text-red-600 font-bold">{row.wrong}</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-bold">{row.skipped}</td>
                        <td className="py-3 px-4 text-center font-bold">{row.accuracy}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center flex-wrap gap-1.5 max-w-sm">
                            {row.questions.map((qNum) => {
                              const qItem = computedStats.questionStatusList.find((x) => x.q === qNum);
                              const isCorr = qItem?.isCorrect;
                              const isWr = qItem?.isWrong;

                              return (
                                <button
                                  key={qNum}
                                  type="button"
                                  onClick={() => handleOpenQuestionReview(qNum)}
                                  className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-bold transition hover:scale-110 cursor-pointer ${
                                    isCorr
                                      ? 'bg-emerald-500 text-white'
                                      : isWr
                                      ? 'bg-red-500 text-white'
                                      : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5'
                                  }`}
                                  title={`Xem chi tiết câu ${qNum} (${qItem?.statusText})`}
                                >
                                  {qNum}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  <tr className="bg-slate-50/70 dark:bg-white/5 font-bold">
                    <td className="py-3 px-4">Tổng cộng</td>
                    <td className="py-3 px-4 text-center text-emerald-600">{computedStats.correctCount}</td>
                    <td className="py-3 px-4 text-center text-red-600">{computedStats.wrongCount}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{computedStats.skippedCount}</td>
                    <td className="py-3 px-4 text-center">{computedStats.accuracy}%</td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Section Đáp án (Ảnh 1) */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="text-base font-bold text-foreground">Đáp án</h2>
              <button
                type="button"
                onClick={handleOpenFullReview}
                className="px-3 py-1 border border-blue-600 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition cursor-pointer"
              >
                Xem chi tiết đáp án
              </button>
              <Link
                href={`/exam/${examId}/practice?retry_wrong=true`}
                className="px-3 py-1 border border-blue-600 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition"
              >
                Làm lại các câu sai
              </Link>
              <span className="text-xs text-red-500 italic ml-1">
                Chú ý: Khi làm lại các câu sai, điểm trung bình của bạn sẽ KHÔNG BỊ ẢNH HƯỞNG.
              </span>
            </div>

            {/* Tips Box */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <strong className="font-semibold">Tips:</strong> Khi xem chi tiết đáp án, bạn có thể nghe lại audio, xem transcript và lời giải chi tiết của từng câu hỏi để ôn tập hiệu quả.
              </p>
            </div>

            {/* Questions Grid 2 columns theo từng Part */}
            <div className="space-y-8">
              {[1, 2, 3, 4, 5, 6, 7].map((pNum) => {
                const partQuestions = computedStats.questionStatusList.filter((x) => x.part === pNum);
                if (partQuestions.length === 0) return null;

                return (
                  <div key={pNum}>
                    <h3 className="text-sm font-bold text-foreground mb-3 pb-1 border-b border-border/60">
                      Part {pNum}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-xs sm:text-sm">
                      {partQuestions.map((item) => (
                        <div
                          key={item.q}
                          className="flex items-center justify-between py-1.5 border-b border-border/40 hover:bg-slate-50/50 dark:hover:bg-white/5 px-1 rounded transition"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                item.isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : item.isWrong
                                  ? 'bg-red-500 text-white'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.q}
                            </span>
                            <span className="text-foreground font-medium">
                              {item.correctAns}:{' '}
                              <em
                                className={`not-italic font-semibold ${
                                  item.isCorrect
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : item.isWrong
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {item.userAns ? `Bạn chọn: ${item.userAns}` : 'chưa trả lời'}
                              </em>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenQuestionReview(item.q)}
                            className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:underline cursor-pointer"
                          >
                            [Chi tiết]
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PageContainer>
      </PageShell>
    );
  }

  // =========================================================================
  // GIAO DIỆN 2: ĐÁP ÁN CHI TIẾT (Ảnh 2 - Chuẩn cơ chế Study4 100%)
  // =========================================================================
  const userAnswers = attempt?.user_answers || {};

  return (
    <PageShell className="pb-24 bg-[#f8f9fa] dark:bg-[#121212] min-h-screen">
      {/* 1. Thanh công cụ trên cùng (Top Toolbar) */}
      <div className="sticky top-0 z-40 bg-white dark:bg-[#1A2417] border-b border-border/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-foreground rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Quay về trang kết quả
              </button>
              <h1 className="text-sm sm:text-base font-extrabold text-foreground line-clamp-1">
                Đáp án chi tiết: {testTitle}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-100 transition cursor-pointer self-start sm:self-auto"
            >
              {expandAll ? 'Ẩn giải thích/transcript' : 'Hiện giải thích/transcript'}
            </button>
          </div>

          {/* Các Tab lọc theo Part */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['Tất cả', 'Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedPartTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedPartTab === tab
                    ? 'bg-[#2b4c7e] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Bố cục 2 Cột: Cột trái (Nội dung câu hỏi) | Cột phải (Question Palette) */}
      <PageContainer className="py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI: Danh sách chi tiết câu hỏi (8 cột) */}
          <div className="lg:col-span-8 space-y-6">
            {filteredReviewQuestions.length === 0 ? (
              <div className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-2xl p-12 text-center text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-sm">Không tìm thấy câu hỏi nào trong phần này.</p>
              </div>
            ) : (
              filteredReviewQuestions.map((q) => {
                const uAns = (userAnswers[q.question_number] || userAnswers[String(q.question_number)] || '').trim().toUpperCase();
                const cAns = (q.correct_option || 'A').trim().toUpperCase();
                const isAnswered = Boolean(uAns);
                const isCorrect = isAnswered && uAns === cAns;
                const isWrong = isAnswered && uAns !== cAns;
                const isSkipped = !isAnswered;

                const isTransOpen = expandedTranscripts[q.question_number] ?? expandAll;
                const isExplOpen = expandedExplanations[q.question_number] ?? expandAll;

                // Chuẩn hóa options thành mảng [key, text]
                const isPart2 = Number(q.part_number) === 2;
                let optionList: [string, string][] = [];
                if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
                  optionList = Object.entries(q.options)
                    .filter(([k]) => !(isPart2 && k.toUpperCase() === 'D'))
                    .map(([k, v]) => {
                      const raw = String(v ?? '');
                      const clean = raw.replace(/^[A-D][.:)\s-]\s*/i, '').trim();
                      const display = clean || (raw && !/^[A-D][.:)\s-]*$/i.test(raw.trim()) ? raw.trim() : '');
                      return [k, display] as [string, string];
                    })
                    .sort(([a], [b]) => a.localeCompare(b));
                } else if (Array.isArray(q.options)) {
                  const targetOpts = isPart2 ? q.options.slice(0, 3) : q.options;
                  optionList = targetOpts.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const raw = String(opt ?? '');
                    const clean = raw.replace(/^[A-D][.:)\s-]\s*/i, '').trim();
                    const display = clean || (raw && !/^[A-D][.:)\s-]*$/i.test(raw.trim()) ? raw.trim() : '');
                    return [letter, display];
                  });
                } else {
                  optionList = (isPart2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map((letter) => [
                    letter,
                    '',
                  ]);
                }

                return (
                  <div
                    key={q.question_number}
                    id={`question-review-${q.question_number}`}
                    className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4 scroll-mt-28"
                  >
                    {/* Header câu hỏi */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-bold text-xs">
                          Part {q.part_number}
                        </span>
                        <span className="text-sm font-extrabold text-foreground">
                          Câu hỏi {q.question_number}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isWrong
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        {isCorrect ? 'ĐÚNG' : isWrong ? 'SAI' : 'CHƯA TRẢ LỜI'}
                      </span>
                    </div>

                    {/* Audio Player (nếu có ở Part 1, 2, 3, 4) */}
                    {q.audio_url && (
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-border/60">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" /> Audio bài nghe:
                        </div>
                        <audio controls src={q.audio_url} className="w-full h-9" preload="none" />
                      </div>
                    )}

                    {/* Hình ảnh câu hỏi (nếu có ở Part 1, 3, 4, 7) */}
                    {q.image_url && (
                      <div className="flex justify-center my-2">
                        <img
                          src={q.image_url}
                          alt={`Hình ảnh câu ${q.question_number}`}
                          className="max-w-full sm:max-w-md max-h-80 object-contain rounded-xl border border-border/70 shadow-2xs"
                        />
                      </div>
                    )}

                    {/* Khối Transcript (Nút bấm và hiển thị chuẩn Study4) */}
                    {q.transcript && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => toggleTranscript(q.question_number)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          <span>{isTransOpen ? 'Ẩn Transcript' : 'Hiện Transcript'}</span>
                          {isTransOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isTransOpen && (
                          <div className="mt-3 p-4 bg-slate-50/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-2xs">
                            {formatTranscript(q.transcript)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nội dung câu hỏi (chỉ hiện khi không phải tiêu đề placeholder [Part 1]...) */}
                    {q.question_text && !q.question_text.startsWith('[Part ') && (
                      <div className="text-sm sm:text-base font-bold text-foreground leading-snug pt-1">
                        {q.question_text}
                      </div>
                    )}

                    {/* Danh sách phương án A, B, C, D */}
                    <div className="space-y-2 pt-1">
                      {optionList.map(([letter, text]) => {
                        const isUserChoice = uAns === letter;
                        const isCorrectChoice = cAns === letter;

                        let optionStyle = 'bg-slate-50/60 dark:bg-white/5 border-border/70 text-foreground';

                        if (isUserChoice && isCorrect) {
                          // Làm đúng: User chọn đáp án này và đây là đáp án đúng -> Highlight Xanh lá
                          optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                        } else if (isUserChoice && isWrong) {
                          // Làm sai: User chọn đáp án này nhưng bị sai -> Đỏ + gạch ngang
                          optionStyle = 'bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 font-bold line-through';
                        } else if (isCorrectChoice && isWrong) {
                          // Đây là đáp án đúng của câu mà user làm sai -> Viền xanh để user biết
                          optionStyle = 'bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold';
                        } else if (isCorrectChoice && isSkipped) {
                          // Câu bỏ qua: viền xanh đáp án đúng
                          optionStyle = 'bg-emerald-50/30 dark:bg-emerald-950/15 border-2 border-dashed border-emerald-500/70 text-emerald-800 dark:text-emerald-300 font-semibold';
                        }

                        return (
                          <div
                            key={letter}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm transition ${optionStyle}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isUserChoice && isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isUserChoice && isWrong
                                  ? 'bg-red-600 text-white'
                                  : isCorrectChoice
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1 pt-0.5 leading-snug">{text || `${letter}.`}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* QUY TẮC HIỂN THỊ TRẠNG THÁI (BẮT BUỘC THEO YÊU CẦU CỦA BẠN) */}
                    <div className="pt-1">
                      {/* Trường hợp 1: User làm ĐÚNG */}
                      {isCorrect && (
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm flex items-center gap-1.5 mt-2">
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>✓ Đáp án đúng: {cAns}</span>
                        </div>
                      )}

                      {/* Trường hợp 2: User làm SAI */}
                      {isWrong && (
                        <div className="mt-2 space-y-1">
                          <div className="text-red-600 dark:text-red-400 font-medium text-xs sm:text-sm flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 stroke-[2.5]" />
                            <span>✕ Lời giải chưa chính xác (Bạn chọn: {uAns})</span>
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                            <span>Đáp án đúng: {cAns}</span>
                          </div>
                        </div>
                      )}

                      {/* Trường hợp 3: User CHƯA LÀM / BỎ QUA */}
                      {isSkipped && (
                        <div className="mt-2 space-y-1">
                          <div className="text-red-500 dark:text-red-400 font-medium text-xs sm:text-sm flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 stroke-[2.5]" />
                            <span>✕ Chưa trả lời / Lời giải chưa chính xác</span>
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                            <span>Đáp án đúng: {cAns}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Khối Lời giải chi tiết (explanation) */}
                    {q.explanation && (
                      <div className="pt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => toggleExplanation(q.question_number)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <span>{isExplOpen ? 'Thu gọn giải thích' : 'Giải thích chi tiết đáp án'}</span>
                          {isExplOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExplOpen && (
                          <div className="mt-2 p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed font-sans">
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* CỘT PHẢI: Bảng điều hướng câu hỏi (Question Palette - 4 cột, Sticky) */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white dark:bg-[#1A2417] border border-border/80 rounded-2xl p-5 shadow-xs space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-extrabold text-foreground text-sm">
                  Danh sách câu hỏi
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  {questions.length} câu
                </span>
              </div>

              {/* Legend chú thích */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-muted-foreground bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-border/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Đúng ({computedStats.correctCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span>Sai ({computedStats.wrongCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                  <span>Chưa làm ({computedStats.skippedCount})</span>
                </div>
              </div>

              {/* Question list grouped by Part */}
              <div className="space-y-4 pt-1">
                {[1, 2, 3, 4, 5, 6, 7].map((pNum) => {
                  const partQs = questions.filter((x) => x.part_number === pNum);
                  if (partQs.length === 0) return null;

                  return (
                    <div key={pNum} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span>Part {pNum}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Câu {partQs[0].question_number} - {partQs[partQs.length - 1].question_number}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                        {partQs.map((q) => {
                          const uAns = (userAnswers[q.question_number] || userAnswers[String(q.question_number)] || '').trim().toUpperCase();
                          const cAns = (q.correct_option || 'A').trim().toUpperCase();
                          const isAnswered = Boolean(uAns);
                          const isCorrect = isAnswered && uAns === cAns;
                          const isWrong = isAnswered && uAns !== cAns;

                          let btnStyle = 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-2xs';
                          } else if (isWrong) {
                            btnStyle = 'bg-red-500 hover:bg-red-600 text-white font-bold shadow-2xs';
                          }

                          return (
                            <button
                              key={q.question_number}
                              type="button"
                              onClick={() => {
                                // Nếu Part hiện tại bị lọc mà không chứa câu hỏi này -> Chuyển sang Part đó
                                if (selectedPartTab !== 'Tất cả' && selectedPartTab !== `Part ${pNum}`) {
                                  setSelectedPartTab(`Part ${pNum}`);
                                }

                                setTimeout(() => {
                                  const el = document.getElementById(`question-review-${q.question_number}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }, 100);
                              }}
                              className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center transition active:scale-95 cursor-pointer ${btnStyle}`}
                              title={`Câu ${q.question_number}: ${isCorrect ? 'Đúng' : isWrong ? 'Sai' : 'Chưa làm'}`}
                            >
                              {q.question_number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}

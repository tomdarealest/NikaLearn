'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Volume2,
  FileText,
  Send,
  Flag,
  HelpCircle,
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
  options: string[] | any;
  correct_option: string;
  difficulty?: string;
  explanation?: string;
  transcript?: string;
}

export default function ExamPracticeRoomPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const testId = (params?.id as string) || '';
  const [resolvedTestId, setResolvedTestId] = useState<string>(testId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đọc params
  const rawParts = searchParams.get('parts') || '1,2,3,4,5,6,7';
  const rawTimeLimit = searchParams.get('time_limit') || '';
  const layout = searchParams.get('layout') || 'default';

  const selectedPartsArray = useMemo(() => {
    return rawParts
      .split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 7);
  }, [rawParts]);

  const [testTitle, setTestTitle] = useState('Đề thi TOEIC');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User state làm bài
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  // Đồng hồ đếm ngược (nếu có time_limit)
  const initialSeconds = useMemo(() => {
    const mins = parseInt(rawTimeLimit, 10);
    return !isNaN(mins) && mins > 0 ? mins * 60 : null;
  }, [rawTimeLimit]);

  const [timeLeft, setTimeLeft] = useState<number | null>(initialSeconds);

  // 1. Fetch đề thi và câu hỏi đã lọc theo Part từ Supabase
  useEffect(() => {
    const loadPracticeData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!testId) {
          setError('Không tìm thấy mã đề thi.');
          return;
        }

        if (!supabase) {
          setError('Không thể kết nối Supabase client.');
          return;
        }

        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        let actualId = testId;

        // Nếu testId không phải là UUID hợp lệ, tìm đề thi đã publish đầu tiên
        if (!isUUID(testId)) {
          const { data: firstPublished } = await supabase
            .from('tests')
            .select('id, title')
            .eq('status', 'published')
            .limit(1)
            .single();

          if (firstPublished?.id) {
            actualId = firstPublished.id;
            setTestTitle(firstPublished.title || 'Đề thi TOEIC Full Test');
          }
        } else {
          // Lấy thông tin đề thi
          const { data: testData } = await supabase
            .from('tests')
            .select('title')
            .eq('id', actualId)
            .single();

          if (testData?.title) {
            setTestTitle(testData.title);
          }
        }

        setResolvedTestId(actualId);

        // Query bảng questions lọc theo test_id và part_number IN selectedPartsArray
        const { data: qList, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', actualId)
          .in('part_number', selectedPartsArray.length > 0 ? selectedPartsArray : [1, 2, 3, 4, 5, 6, 7])
          .order('question_number', { ascending: true });

        if (qError) {
          console.error('Supabase questions query error:', qError);
          throw new Error('Lỗi truy vấn câu hỏi từ hệ thống.');
        }

        if (!qList || qList.length === 0) {
          setError(`Không có câu hỏi nào trong các phần đã chọn (Part ${selectedPartsArray.join(', ')}).`);
          return;
        }

        setQuestions(qList);
      } catch (err: any) {
        setError(err.message || 'Lỗi không xác định khi tải câu hỏi.');
      } finally {
        setLoading(false);
      }
    };

    loadPracticeData();
  }, [testId, selectedPartsArray]);

  // 2. Timer đếm ngược
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      alert('Đã hết thời gian làm bài!');
      handleSubmitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (qNumber: number, optionLetter: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qNumber]: optionLetter,
    }));
  };

  const currentQ = questions[currentIdx];

  // Chuẩn hóa options
  const parsedOptions = useMemo(() => {
    if (!currentQ) return [];

    let rawOpts = currentQ.options || (currentQ as any)?.choices;
    if (typeof rawOpts === 'string') {
      try {
        rawOpts = JSON.parse(rawOpts);
      } catch {
        // Giữ nguyên rawOpts
      }
    }

    // Part 2 TOEIC chỉ có 3 đáp án: A, B, C (ẩn đáp án D)
    const isPart2 = Number(currentQ.part_number) === 2;
    const targetLetters = isPart2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];

    return targetLetters.map((letter, idx) => {
      let rawText = '';
      if (rawOpts && typeof rawOpts === 'object' && !Array.isArray(rawOpts)) {
        rawText = rawOpts[letter] || rawOpts[letter.toLowerCase()] || '';
      } else if (Array.isArray(rawOpts)) {
        rawText = rawOpts[idx] || '';
      }

      if (typeof rawText !== 'string') {
        rawText = (rawText as any)?.content || (rawText as any)?.text || (rawText ? String(rawText) : '');
      }

      // Cắt bỏ tiền tố "A. ", "B. ", "A) ", "B: " nếu có để tránh hiển thị 2 chữ cái lặp lại cạnh badge
      const cleanText = rawText.replace(/^[A-D][.:)\s-]\s*/i, '').trim();

      // Nếu rawText chỉ là "A." hoặc "A" (như ở Part 1 hoặc 2 chỉ nghe audio), sau khi cắt sẽ rỗng -> để rỗng, không fallback "Phương án A"
      const content = cleanText || (rawText && !/^[A-D][.:)\s-]*$/i.test(rawText.trim()) ? rawText.trim() : '');

      return {
        letter,
        content,
      };
    });
  }, [currentQ]);

  // Nộp bài và lưu vào lịch sử
  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Tính điểm
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;

      questions.forEach((q) => {
        const userAns = (userAnswers[q.question_number] || '').trim().toUpperCase();
        const correctAns = (q.correct_option || 'A').trim().toUpperCase();
        if (!userAns) {
          skippedCount++;
        } else if (userAns === correctAns) {
          correctCount++;
        } else {
          wrongCount++;
        }
      });

      // 2. Thời gian làm bài
      const totalSpentSecs = initialSeconds ? Math.max(0, initialSeconds - (timeLeft || 0)) : 120;
      const spentMin = Math.floor(totalSpentSecs / 60);
      const spentSec = totalSpentSecs % 60;
      const timeSpentFormatted = `0:${spentMin < 10 ? '0' : ''}${spentMin}:${spentSec < 10 ? '0' : ''}${spentSec}`;

      const targetTestId = resolvedTestId || testId;

      if (user?.id) {
        let attemptId = `res-${Date.now()}`;

        // 3. Lưu vào Database public.test_attempts trên Supabase
        if (supabase) {
          try {
            const { data: attemptRow, error: attemptErr } = await supabase
              .from('test_attempts')
              .insert({
                user_id: user.id,
                test_id: targetTestId,
                user_answers: userAnswers,
                selected_parts: selectedPartsArray,
                total_questions: questions.length,
                correct_count: correctCount,
                wrong_count: wrongCount,
                skipped_count: skippedCount,
                score: correctCount,
                time_taken_seconds: totalSpentSecs,
              })
              .select('id')
              .single();

            if (attemptRow?.id) {
              attemptId = attemptRow.id;
            } else if (attemptErr) {
              console.error('Lỗi khi insert test_attempts lên Supabase:', attemptErr);
            }
          } catch (dbErr) {
            console.error('DB Insert error:', dbErr);
          }
        }

        // 4. Lưu cache cục bộ gắn liền với user_id (tránh ghi đè giữa các tài khoản)
        const attemptPayload = {
          id: attemptId,
          user_id: user.id,
          test_id: targetTestId,
          user_answers: userAnswers,
          selected_parts: selectedPartsArray,
          total_questions: questions.length,
          correct_count: correctCount,
          wrong_count: wrongCount,
          skipped_count: skippedCount,
          score: correctCount,
          time_taken_seconds: totalSpentSecs,
          created_at: new Date().toISOString(),
        };

        localStorage.setItem(`toeic_attempt_${user.id}_${testId}`, JSON.stringify(attemptPayload));
        if (targetTestId !== testId) {
          localStorage.setItem(`toeic_attempt_${user.id}_${targetTestId}`, JSON.stringify(attemptPayload));
        }

        // 5. Cập nhật danh sách hoàn thành cho riêng tài khoản này
        const userKey = `completed_toeic_exams_user_${user.id}`;
        const stored = JSON.parse(localStorage.getItem(userKey) || '[]');
        if (!stored.includes(testId)) stored.push(testId);
        if (targetTestId && !stored.includes(targetTestId)) stored.push(targetTestId);
        localStorage.setItem(userKey, JSON.stringify(stored));

        // 6. Lưu lịch sử làm bài theo account
        const histKey = `exam_history_${user.id}_${testId}`;
        const existingHist = JSON.parse(localStorage.getItem(histKey) || '[]');
        const newEntry = {
          id: attemptId,
          date: new Date().toLocaleDateString('vi-VN'),
          parts: selectedPartsArray,
          score: `${correctCount}/${questions.length}`,
          timeSpent: timeSpentFormatted,
        };
        localStorage.setItem(histKey, JSON.stringify([newEntry, ...existingHist]));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }

        router.push(`/exam/${testId}/result?attempt_id=${attemptId}`);
      } else {
        // Tài khoản khách (Guest)
        const guestAttemptId = `guest-${Date.now()}`;
        const guestAttempt = {
          id: guestAttemptId,
          test_id: targetTestId,
          user_answers: userAnswers,
          selected_parts: selectedPartsArray,
          total_questions: questions.length,
          correct_count: correctCount,
          wrong_count: wrongCount,
          skipped_count: skippedCount,
          score: correctCount,
          time_taken_seconds: totalSpentSecs,
          created_at: new Date().toISOString(),
        };

        localStorage.setItem(`toeic_attempt_guest_${testId}`, JSON.stringify(guestAttempt));
        router.push(`/exam/${testId}/result?attempt_id=${guestAttemptId}&guest=true`);
      }
    } catch (e) {
      console.warn('Lỗi khi nộp bài:', e);
      setIsSubmitting(false);
      router.push(`/exam/${testId}/result`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#121212]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#2b4c7e] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
            Đang tải phòng luyện thi Part {selectedPartsArray.join(', ')}...
          </p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <PageShell className="pb-16 bg-background min-h-screen">
        <PageContainer className="py-16 max-w-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Không thể vào phòng thi</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="pt-2">
            <Link
              href={`/exam/${testId}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#2b4c7e] text-white rounded-lg text-sm font-semibold hover:bg-[#1e3a63] transition"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại chọn Part
            </Link>
          </div>
        </PageContainer>
      </PageShell>
    );
  }

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <PageShell className="pb-16 bg-[#f8f9fa] dark:bg-[#121212] min-h-screen">
      {/* Top Practice Room Bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-[#1E261D] border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/exam/${testId}`}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 transition"
              title="Thoát phòng luyện tập"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white line-clamp-1">
                {testTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Luyện tập: Part {selectedPartsArray.join(', ')} • {questions.length} câu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer Display */}
            {timeLeft !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-700 dark:text-amber-300 font-mono font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (confirm(`Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`)) {
                  handleSubmitExam();
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2b4c7e] hover:bg-[#1e3a63] text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          </div>
        </div>
      </div>

      <PageContainer className="py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Display (3 cột) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#1E261D] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-xs">
                    Part {currentQ.part_number}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    Câu hỏi số {currentQ.question_number}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Câu {currentIdx + 1} trên {questions.length}
                </span>
              </div>

              {/* Audio Player if available (Part 1, 2, 3, 4) */}
              {currentQ.audio_url && (
                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Volume2 className="w-4 h-4 text-blue-600" /> File nghe Audio
                  </div>
                  <audio controls className="w-full h-10" src={currentQ.audio_url}>
                    Trình duyệt của bạn không hỗ trợ thẻ audio.
                  </audio>
                </div>
              )}

              {/* Image Preview if available (Part 1, Part 3, Part 7) */}
              {currentQ.image_url && (
                <div className="flex justify-center my-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQ.image_url}
                    alt={`Ảnh minh họa câu ${currentQ.question_number}`}
                    className="max-h-72 object-contain rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
              )}

              {/* Question Text */}
              <div className="text-base text-slate-800 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                {currentQ.question_text || `Câu hỏi số ${currentQ.question_number}`}
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {parsedOptions.map((opt) => {
                  const isSelected = userAnswers[currentQ.question_number] === opt.letter;

                  return (
                    <div
                      key={opt.letter}
                      onClick={() => handleSelectOption(currentQ.question_number, opt.letter)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/5'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {opt.letter}
                      </span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 leading-snug pt-0.5">
                        {opt.content}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Câu trước
                </button>

                <button
                  type="button"
                  disabled={currentIdx === questions.length - 1}
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Câu tiếp <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Palette Sidebar (1 cột) */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#1E261D] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Danh sách câu hỏi</h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  Đã làm: {answeredCount}/{questions.length}
                </span>
              </div>

              {/* Palette Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(userAnswers[q.question_number]);
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-blue-600 font-black'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {q.question_number}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  <span>Đã chọn đáp án</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-slate-700 inline-block" />
                  <span>Chưa làm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}

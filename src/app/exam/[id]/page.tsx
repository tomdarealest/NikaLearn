'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  Users,
  Lightbulb,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PageShell from '@/components/PageShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface PartConfig {
  id: number;
  name: string;
  questionCount: number;
  tags: string[];
}

const TOEIC_PARTS: PartConfig[] = [
  {
    id: 1,
    name: 'Part 1 (6 câu hỏi)',
    questionCount: 6,
    tags: [
      '#[Part 1] Tranh tả người',
      '#[Part 1] Tranh tả vật',
      '#[Part 1] Tranh tả cả người và vật',
    ],
  },
  {
    id: 2,
    name: 'Part 2 (25 câu hỏi)',
    questionCount: 25,
    tags: [
      '#[Part 2] Câu hỏi WHAT',
      '#[Part 2] Câu hỏi WHO',
      '#[Part 2] Câu hỏi WHEN',
      '#[Part 2] Câu hỏi HOW',
      '#[Part 2] Câu hỏi WHY',
      '#[Part 2] Câu hỏi YES/NO',
      '#[Part 2] Câu hỏi đuôi',
      '#[Part 2] Câu hỏi lựa chọn',
      '#[Part 2] Câu yêu cầu, đề nghị',
      '#[Part 2] Câu trần thuật',
    ],
  },
  {
    id: 3,
    name: 'Part 3 (39 câu hỏi)',
    questionCount: 39,
    tags: [
      '#[Part 3] Câu hỏi về chủ đề, mục đích',
      '#[Part 3] Câu hỏi về danh tính người nói',
      '#[Part 3] Câu hỏi về chi tiết cuộc hội thoại',
      '#[Part 3] Câu hỏi về hành động tương lai',
      '#[Part 3] Câu hỏi kết hợp bảng biểu',
      '#[Part 3] Câu hỏi về hàm ý câu nói',
      '#[Part 3] Chủ đề: Company - General Office Work',
      '#[Part 3] Chủ đề: Company - Personnel',
      '#[Part 3] Chủ đề: Company - Event, Project',
      '#[Part 3] Chủ đề: Shopping, Service',
      '#[Part 3] Chủ đề: Order, delivery',
      '#[Part 3] Chủ đề: Housing',
      '#[Part 3] Câu hỏi về địa điểm hội thoại',
      '#[Part 3] Câu hỏi về yêu cầu, gợi ý',
    ],
  },
  {
    id: 4,
    name: 'Part 4 (30 câu hỏi)',
    questionCount: 30,
    tags: [
      '#[Part 4] Câu hỏi về chủ đề, mục đích',
      '#[Part 4] Câu hỏi về danh tính, địa điểm',
      '#[Part 4] Câu hỏi về chi tiết',
      '#[Part 4] Câu hỏi về hành động tương lai',
      '#[Part 4] Câu hỏi kết hợp bảng biểu',
      '#[Part 4] Câu hỏi về hàm ý câu nói',
      '#[Part 4] Dạng bài: Telephone message - Tin nhắn thoại',
      '#[Part 4] Dạng bài: News report, Broadcast - Bản tin',
      '#[Part 4] Dạng bài: Talk - Bài phát biểu, diễn văn',
      '#[Part 4] Dạng bài: Excerpt from a meeting - Trích dẫn từ buổi họp',
      '#[Part 4] Câu hỏi yêu cầu, gợi ý',
    ],
  },
  {
    id: 5,
    name: 'Part 5 (30 câu hỏi)',
    questionCount: 30,
    tags: [
      '#[Part 5] Câu hỏi từ loại',
      '#[Part 5] Câu hỏi ngữ pháp',
      '#[Part 5] Câu hỏi từ vựng',
      '#[Grammar] Danh từ',
      '#[Grammar] Đại từ',
      '#[Grammar] Tính từ',
      '#[Grammar] Thì',
      '#[Grammar] Thể',
      '#[Grammar] Trạng từ',
      '#[Grammar] Phân từ và Cấu trúc phân từ',
      '#[Grammar] Giới từ',
      '#[Grammar] Liên từ',
    ],
  },
  {
    id: 6,
    name: 'Part 6 (16 câu hỏi)',
    questionCount: 16,
    tags: [
      '#[Part 6] Câu hỏi từ loại',
      '#[Part 6] Câu hỏi ngữ pháp',
      '#[Part 6] Câu hỏi từ vựng',
      '#[Part 6] Câu hỏi điền câu vào đoạn văn',
      '#[Part 6] Hình thức: Thư điện tử/ thư tay (Email/ Letter)',
      '#[Part 6] Hình thức: Bài báo (Article/ Review)',
      '#[Part 6] Hình thức: Quảng cáo (Advertisement)',
      '#[Part 6] Hình thức: Thông báo/ văn bản hướng dẫn (Notice/ Announcement Information)',
      '#[Grammar] Danh từ',
      '#[Grammar] Đại từ',
      '#[Grammar] Thì',
      '#[Grammar] Danh động từ',
      '#[Grammar] Giới từ',
      '#[Grammar] Liên từ',
      '#[Grammar] Mệnh đề quan hệ',
    ],
  },
  {
    id: 7,
    name: 'Part 7 (54 câu hỏi)',
    questionCount: 54,
    tags: [
      '#[Part 7] Câu hỏi tìm thông tin',
      '#[Part 7] Câu hỏi tìm chi tiết sai',
      '#[Part 7] Câu hỏi về chủ đề, mục đích',
      '#[Part 7] Câu hỏi suy luận',
      '#[Part 7] Cấu trúc: một đoạn',
      '#[Part 7] Cấu trúc: nhiều đoạn',
      '#[Part 7] Dạng bài: Email/ Letter: Thư điện tử/ Thư tay',
      '#[Part 7] Dạng bài: Article/ Review: Bài báo/ Bài đánh giá',
      '#[Part 7] Dạng bài: Advertisement - Quảng cáo',
      '#[Part 7] Dạng bài: Text message chain - Chuỗi tin nhắn',
      '#[Part 7] Câu hỏi tìm từ đồng nghĩa',
      '#[Part 7] Câu hỏi về hàm ý câu nói',
      '#[Part 7] Dạng bài: Schedule - Lịch trình, thời gian biểu',
      '#[Part 7] Dạng bài: Instructions: Văn bản hướng dẫn',
      '#[Part 7] Dạng bài: List/ Menu: Danh sách/ Thực đơn',
    ],
  },
];

export default function ExamDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const examId = (params?.id as string) || 'collection-1-test-1';

  const [testTitle, setTestTitle] = useState('');
  const [testDuration, setTestDuration] = useState(120);
  const [testQuestionsCount, setTestQuestionsCount] = useState(200);
  const [partCounts, setPartCounts] = useState<Record<number, number>>({
    1: 6,
    2: 25,
    3: 39,
    4: 30,
    5: 30,
    6: 16,
    7: 54,
  });

  const [isCompleted, setIsCompleted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [headerTab, setHeaderTab] = useState<'info' | 'transcript'>('info');
  const [mainTab, setMainTab] = useState<'practice' | 'full' | 'discuss'>('practice');
  const [selectedParts, setSelectedParts] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [timeLimit, setTimeLimit] = useState('');
  const [interfaceMode, setInterfaceMode] = useState('default');

  // Fetch test info & question counts from Supabase
  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        // 1. Fetch từ endpoint API backend để luôn lấy title mới nhất của Admin
        const resExam = await fetch(`/api/exams/${examId}?t=` + Date.now());
        const dataExam = await resExam.json();
        if (dataExam.success && dataExam.data?.exam) {
          const ex = dataExam.data.exam;
          setTestTitle(ex.title);
          if (ex.duration_minutes) setTestDuration(ex.duration_minutes);
          if (ex.question_count) setTestQuestionsCount(ex.question_count);
        }

        if (supabase) {
          // 2. Fetch test by id nếu API chưa có title
          if (!dataExam.success) {
            const { data: testData } = await supabase
              .from('tests')
              .select('*')
              .eq('id', examId)
              .single();

            if (testData) {
              setTestTitle(testData.title);
              if (testData.duration_minutes) setTestDuration(testData.duration_minutes);
              if (testData.total_questions) setTestQuestionsCount(testData.total_questions);
            }
          }

          // 3. Fetch actual part question counts from questions table
          const { data: qData } = await supabase
            .from('questions')
            .select('part_number')
            .eq('test_id', examId);

          if (qData && qData.length > 0) {
            const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
            qData.forEach((q: any) => {
              const p = Number(q.part_number);
              if (counts[p] !== undefined) counts[p]++;
            });
            setPartCounts(counts);
          }
        }
      } catch (err) {
        console.warn('Could not fetch test details:', err);
      }
    };

    fetchTestDetails();

    if (examId) {
      try {
        router.prefetch(`/exam/${examId}/practice`);
      } catch (e) {}
    }
  }, [examId, router]);

  const titleDisplay = testTitle || (examId.includes('test-')
    ? examId.split('test-')[1] ? `Test ${examId.split('test-')[1]}` : examId
    : examId);

  // Đọc trạng thái đã làm xong từ Database / localStorage của ĐÚNG account
  useEffect(() => {
    if (!user?.id) {
      setIsCompleted(false);
      setHistory([]);
      return;
    }

    const loadUserAttempts = async () => {
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      let targetId = examId;

      if (supabase && !isUUID(examId)) {
        try {
          const { data: firstPublished } = await supabase
            .from('tests')
            .select('id')
            .eq('status', 'published')
            .limit(1)
            .single();
          if (firstPublished?.id) {
            targetId = firstPublished.id;
          }
        } catch {}
      }

      // 1. Thử fetch từ Supabase test_attempts trước
      if (supabase) {
        try {
          const { data: attempts, error } = await supabase
            .from('test_attempts')
            .select('id, created_at, selected_parts, correct_count, total_questions, time_taken_seconds, score')
            .in('test_id', [examId, targetId])
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && attempts && attempts.length > 0) {
            const formatted = attempts.map((a: any) => {
              const totalSecs = a.time_taken_seconds || 0;
              const spentM = Math.floor(totalSecs / 60);
              const spentS = totalSecs % 60;
              return {
                id: a.id,
                date: new Date(a.created_at).toLocaleDateString('vi-VN'),
                parts: a.selected_parts || [1, 2, 3, 4, 5, 6, 7],
                score: `${a.correct_count || 0}/${a.total_questions || 200}`,
                timeSpent: `0:${spentM < 10 ? '0' : ''}${spentM}:${spentS < 10 ? '0' : ''}${spentS}`,
              };
            });
            setHistory(formatted);
            setIsCompleted(true);
            return;
          }
        } catch (err) {
          console.warn('Lỗi fetch test_attempts:', err);
        }
      }

      // 2. Fallback đọc localStorage theo account
      try {
        const userKey = `completed_toeic_exams_user_${user.id}`;
        const stored = localStorage.getItem(userKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && (parsed.includes(examId) || parsed.includes(targetId))) {
            setIsCompleted(true);
            const hist = localStorage.getItem(`exam_history_${user.id}_${examId}`) ||
                         localStorage.getItem(`exam_history_${user.id}_${targetId}`);
            if (hist) {
              setHistory(JSON.parse(hist));
            } else {
              setHistory([]);
            }
            return;
          }
        }
        setIsCompleted(false);
        setHistory([]);
      } catch {
        setIsCompleted(false);
        setHistory([]);
      }
    };

    loadUserAttempts();
  }, [examId, user?.id]);

  const togglePart = (id: number) => {
    setSelectedParts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleStartPractice = () => {
    if (selectedParts.length === 0) {
      alert('Vui lòng chọn ít nhất 1 phần thi để bắt đầu luyện tập!');
      return;
    }

    // Điều hướng sang phòng thi practice với các params
    router.push(
      `/exam/${examId}/practice?parts=${selectedParts.sort((a, b) => a - b).join(',')}&time_limit=${timeLimit}&layout=${interfaceMode}`
    );
  };

  return (
    <PageShell className="pb-20 bg-background min-h-screen">
      <PageContainer className="py-6 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/exam"
          prefetch={true}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại danh sách đề thi
        </Link>

        {/* 1. Header Information */}
        <div className="space-y-3 mb-6">
          <span className="inline-block bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded">
            #TOEIC
          </span>

          {/* Tiêu đề:
              - Chưa làm (Ảnh 2): Không có tích xanh
              - Đã làm (Ảnh 3): Có tích xanh tròn bên cạnh
          */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {titleDisplay}
            </h1>
            {isCompleted && (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            )}
          </div>

          {/* Action Sub Tabs */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setHeaderTab('info')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                headerTab === 'info'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Thông tin đề thi
            </button>
            <button
              type="button"
              onClick={() => setHeaderTab('transcript')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                headerTab === 'transcript'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Đáp án/transcript
            </button>
          </div>

          {/* Metadata info */}
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1.5 pt-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Thời gian làm bài: 120 phút
              </span>
              <span>|</span>
              <span>7 phần thi</span>
              <span>|</span>
              <span>200 câu hỏi</span>
              <span>|</span>
              <span>237 bình luận</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>252,831 người đã luyện tập đề thi này</span>
            </div>
          </div>

          {/* Red Notice */}
          <p className="text-xs sm:text-sm text-red-500 italic pt-1">
            Chú ý: để được quy đổi sang scaled score (ví dụ trên thang điểm 990 cho TOEIC hoặc 9.0 cho IELTS), vui lòng chọn chế độ làm FULL TEST.
          </p>
        </div>

        {/* 2. Bảng Kết quả làm bài của bạn (CHỈ HIỆN KHI ĐÃ LÀM - Ảnh 3) */}
        {isCompleted && history.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-bold text-foreground mb-3">
              Kết quả làm bài của bạn:
            </h2>
            <div className="border border-border/80 rounded-xl overflow-hidden bg-white dark:bg-[#1A2417] shadow-2xs">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 dark:bg-white/5 text-muted-foreground font-semibold border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Ngày làm</th>
                    <th className="py-3 px-4">Kết quả</th>
                    <th className="py-3 px-4">Thời gian làm bài</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div>{record.date || '24/10/2026'}</div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Luyện tập
                          </span>
                          {(record.parts || [1, 2, 3, 4, 5, 6, 7]).map((p: number) => (
                            <span
                              key={p}
                              className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                            >
                              Part {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-semibold">
                        {record.score || '0/200'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">
                        {record.timeSpent || '0:00:20'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {/* Bấm vào Xem chi tiết sẽ hiện trang kết quả tương ứng */}
                        <Link
                          href={`/exam/${examId}/result${record.id ? `?attempt_id=${record.id}` : ''}`}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Main Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => setMainTab('practice')}
              className={`pb-3 text-sm font-bold transition relative ${
                mainTab === 'practice'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Luyện tập
            </button>
            <button
              type="button"
              onClick={() => setMainTab('full')}
              className={`pb-3 text-sm font-bold transition relative ${
                mainTab === 'full'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Làm full test
            </button>
            <button
              type="button"
              onClick={() => setMainTab('discuss')}
              className={`pb-3 text-sm font-bold transition relative ${
                mainTab === 'discuss'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Thảo luận
            </button>
          </div>
        </div>

        {/* 4. Pro tips Alert Box */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3.5 sm:p-4 mb-6 flex items-start gap-2.5 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
          <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="font-semibold">Pro tips:</strong> Hình thức luyện tập từng phần và chọn mức thời gian phù hợp sẽ giúp bạn tập trung vào giải đúng các câu hỏi thay vì phải chịu áp lực hoàn thành bài thi.
          </p>
        </div>

        {/* 5. Choose Parts to Practice (Ảnh 2 & Ảnh 3) */}
        <div className="space-y-6 mb-8">
          <h2 className="text-base font-bold text-foreground">
            Chọn phần thi bạn muốn làm
          </h2>

          <div className="space-y-5">
            {TOEIC_PARTS.map((part) => {
              const isChecked = selectedParts.includes(part.id);

              return (
                <div key={part.id} className="space-y-2">
                  {/* Checkbox Header */}
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePart(part.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span className="font-semibold text-sm sm:text-base text-foreground">
                      {part.name.replace(/\(\d+\s*câu hỏi\)/, `(${partCounts[part.id] ?? part.questionCount} câu hỏi)`)}
                    </span>
                  </label>

                  {/* Tag List */}
                  <div className="flex flex-wrap gap-1.5 pl-6.5">
                    {part.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-[#f1f3f5] dark:bg-white/10 hover:bg-[#e9ecef] dark:hover:bg-white/15 text-gray-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Configuration Selects (Giống 100% Ảnh 3) */}
        <div className="space-y-4 max-w-md mb-8">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Giới hạn thời gian (Để trống để làm bài không giới hạn)
            </label>
            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2616] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn thời gian --</option>
              <option value="5">5 phút</option>
              <option value="10">10 phút</option>
              <option value="15">15 phút</option>
              <option value="20">20 phút</option>
              <option value="30">30 phút</option>
              <option value="45">45 phút</option>
              <option value="60">60 phút</option>
              <option value="75">75 phút</option>
              <option value="90">90 phút</option>
              <option value="120">120 phút</option>
              <option value="135">135 phút</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Giao diện
            </label>
            <select
              value={interfaceMode}
              onChange={(e) => setInterfaceMode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2616] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Mặc định</option>
              <option value="two_columns">Giao diện 2 cột (Đọc hiểu)</option>
            </select>
          </div>
        </div>

        {/* 7. Primary Action Button (Nút LUYỆN TẬP màu #2b4c7e) */}
        <div>
          <button
            type="button"
            onClick={handleStartPractice}
            className="w-full sm:w-auto px-8 py-2.5 bg-[#2b4c7e] hover:bg-[#1e3a63] active:scale-98 text-white font-bold rounded-md text-sm uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            LUYỆN TẬP
          </button>
        </div>
      </PageContainer>
    </PageShell>
  );
}

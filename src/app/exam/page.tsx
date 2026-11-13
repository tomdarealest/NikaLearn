'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Search,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PageShell from '@/components/PageShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ExamCardItem {
  id: string;
  category: string;
  collection: string;
  testName: string;
  duration_minutes: number;
  participants_count: number;
  comments_count: number;
  parts_count: number;
  question_count: number;
  tag: string;
}

const DEFAULT_TOEIC_EXAMS: ExamCardItem[] = [
  {
    id: 'collection-1-test-1',
    category: 'TOEIC LR',
    collection: 'Collection 1',
    testName: 'Collection 1 Test 1',
    duration_minutes: 120,
    participants_count: 585855,
    comments_count: 555,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-1-test-2',
    category: 'TOEIC LR Collection 1',
    collection: 'Collection 1',
    testName: 'Test 2',
    duration_minutes: 120,
    participants_count: 252831,
    comments_count: 237,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-1-test-3',
    category: 'TOEIC LR Collection 1',
    collection: 'Collection 1',
    testName: 'Test 3',
    duration_minutes: 120,
    participants_count: 310420,
    comments_count: 412,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-1-test-4',
    category: 'TOEIC LR Collection 1',
    collection: 'Collection 1',
    testName: 'Test 4',
    duration_minutes: 120,
    participants_count: 198150,
    comments_count: 189,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-1-test-5',
    category: 'TOEIC LR Collection 1',
    collection: 'Collection 1',
    testName: 'Test 5',
    duration_minutes: 120,
    participants_count: 275600,
    comments_count: 304,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-1-test-6',
    category: 'TOEIC LR Collection 1',
    collection: 'Collection 1',
    testName: 'Test 6',
    duration_minutes: 120,
    participants_count: 164200,
    comments_count: 150,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-2-test-1',
    category: 'TOEIC LR Collection 2',
    collection: 'Collection 2',
    testName: 'Test 1',
    duration_minutes: 120,
    participants_count: 420900,
    comments_count: 520,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
  {
    id: 'collection-2-test-2',
    category: 'TOEIC LR Collection 2',
    collection: 'Collection 2',
    testName: 'Test 2',
    duration_minutes: 120,
    participants_count: 330100,
    comments_count: 280,
    parts_count: 7,
    question_count: 200,
    tag: '#TOEIC',
  },
];


async function fetchPublishedTests(): Promise<ExamCardItem[]> {
  try {
    const res = await fetch('/api/exams?t=' + Date.now());
    const json = await res.json();

    if (json.success && Array.isArray(json.data?.exams) && json.data.exams.length > 0) {
      return json.data.exams.map((item: any, idx: number) => {
        const originalTitle = item.title?.trim() || `Đề thi ${idx + 1}`;
        return {
          id: String(item.id),
          category: '',
          collection: '',
          testName: originalTitle,
          duration_minutes: item.duration_minutes || 120,
          participants_count: 150000 + (idx * 35200) % 400000,
          comments_count: 120 + (idx * 45) % 400,
          parts_count: 7,
          question_count: item.question_count || 200,
          tag: item.code ? `#${item.code}` : '#TOEIC',
        };
      });
    }

    if (supabase) {
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (Array.isArray(testsData) && testsData.length > 0) {
        return testsData.map((item: any, idx: number) => {
          const originalTitle = item.title?.trim() || `Đề thi ${idx + 1}`;
          return {
            id: String(item.id),
            category: '',
            collection: '',
            testName: originalTitle,
            duration_minutes: item.duration_minutes || 120,
            participants_count: item.attempt_count || 150000 + (idx * 35200) % 400000,
            comments_count: item.comment_count || 120 + (idx * 45) % 400,
            parts_count: 7,
            question_count: item.total_questions || 200,
            tag: item.code ? `#${item.code}` : '#TOEIC',
          };
        });
      }
    }

    return [];
  } catch (err) {
    console.error('Error fetching tests from supabase:', err);
    return [];
  }
}

export default function ExamPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const { data: exams = [], isLoading: loading } = useQuery({
    queryKey: ['published-exams'],
    queryFn: fetchPublishedTests,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Dọn dẹp dữ liệu hoàn thành cũ không gắn với account
  useEffect(() => {
    try {
      localStorage.removeItem('completed_toeic_exams');
    } catch { }
  }, []);

  // Đọc danh sách bài thi đã làm của ĐÚNG account đang đăng nhập
  useEffect(() => {
    // Nếu chưa đăng nhập hoặc không có account -> không có bài thi nào được đánh dấu hoàn thành
    if (!user?.id) {
      setCompletedIds([]);
      return;
    }

    const loadAccountCompletedExams = () => {
      try {
        const userKey = `completed_toeic_exams_user_${user.id}`;
        const stored = localStorage.getItem(userKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCompletedIds(parsed);
            return;
          }
        }
        setCompletedIds([]);
      } catch {
        setCompletedIds([]);
      }
    };

    loadAccountCompletedExams();

    window.addEventListener('storage', loadAccountCompletedExams);
    return () => {
      window.removeEventListener('storage', loadAccountCompletedExams);
    };
  }, [user?.id]);

  const filteredExams = exams.filter((exam) => {
    const fullText = `${exam.category} ${exam.testName} ${exam.tag}`.toLowerCase();
    const matchSearch = fullText.includes(searchQuery.toLowerCase());
    const matchCollection = collectionFilter
      ? exam.collection.toLowerCase().includes(collectionFilter.toLowerCase())
      : true;

    return matchSearch && matchCollection;
  });

  return (
    <PageShell className="pb-16 bg-background">
      {/* 1. HERO SECTION */}
      <section className="page-hero bg-gradient-to-b from-[#6B8045]/15 dark:from-[#6B8045]/10 to-background border-b border-border/40">
        <PageContainer className="py-6 sm:py-7">
          <h1 className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight">
            Kho đề thi TOEIC Full Test
          </h1>
        </PageContainer>
      </section>

      {/* 2. FILTER & SEARCH (Giữ lại thanh tìm kiếm đề thi) */}
      <PageContainer className="py-7 sm:py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm đề thi (Test 1, Collection 1...)"
              className="w-full pl-10 pr-4 py-2.5 surface-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="px-4 py-2.5 surface-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả bộ đề</option>
            <option value="Collection 1">Collection 1</option>
            <option value="Collection 2">Collection 2</option>
          </select>
        </div>

        {/* 3. CARD GRID (Thiết kế chuẩn theo Ảnh 1 và Ảnh 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredExams.map((exam) => {
            const isCompleted = completedIds.includes(exam.id);

            return (
              <Link
                key={exam.id}
                href={`/exam/${exam.id}`}
                prefetch={true}
                className="group bg-white dark:bg-[#1E261D] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Trạng thái 1: Đã làm xong -> Hiện tích xanh (Ảnh 2) */}
                  {isCompleted ? (
                    <div className="flex items-start gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-foreground text-base sm:text-[17px] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {exam.testName}
                        </h3>
                      </div>
                    </div>
                  ) : (
                    /* Trạng thái 2: Chưa làm -> KHÔNG có tích xanh (Ảnh 1) */
                    <div className="mb-3">
                      <h3 className="font-bold text-foreground text-base sm:text-[17px] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {exam.testName}
                      </h3>
                    </div>
                  )}

                  {/* Stats row 1: Time */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exam.duration_minutes} phút</span>
                  </div>

                  {/* Stats row 2: Parts | Questions */}
                  <p className="text-sm font-semibold text-foreground/90 mb-3">
                    {exam.parts_count} phần thi | {exam.question_count} câu hỏi
                  </p>

                  {/* Tag pill */}
                  <div className="mb-4">
                    <span className="inline-block bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2.5 py-1 rounded">
                      {exam.tag}
                    </span>
                  </div>
                </div>

                {/* Nút hành động:
                    - Đã làm xong: nút viền xám "Xem kết quả" (Ảnh 2)
                    - Chưa làm: nút viền xanh "Chi tiết" (Ảnh 1)
                */}
                {isCompleted ? (
                  <div className="w-full py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-center font-medium text-sm group-hover:border-slate-400 transition">
                    Xem kết quả
                  </div>
                ) : (
                  <div className="w-full py-2 border border-[#2b4c7e] text-[#2b4c7e] dark:border-blue-400 dark:text-blue-400 rounded-lg text-center font-medium text-sm group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20 transition">
                    Chi tiết
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {filteredExams.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Không tìm thấy đề thi phù hợp.</p>
          </div>
        )}
      </PageContainer>
    </PageShell>
  );
}

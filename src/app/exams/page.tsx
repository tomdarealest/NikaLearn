'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Search,
  Loader,
  Clock,
  FileQuestion,
  Award,
  BookOpen,
} from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PageShell from '@/components/PageShell';

interface PublicExam {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  exam_type: 'practice' | 'graded';
  subject: string;
  duration_minutes: number;
  total_score: number;
  pass_score: number;
  question_count: number;
  created_at: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<PublicExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchExams();
  }, [typeFilter]);

  const fetchExams = async (search = searchQuery) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter) params.set('exam_type', typeFilter);

      const res = await fetch(`/api/exams?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được đề thi');
      }
      setExams(data.data.exams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExams(searchQuery);
  };

  return (
    <PageShell className="pb-16">
      <section className="page-hero bg-gradient-to-b from-blue-50/50 dark:from-blue-950/20 to-background">
        <PageContainer className="py-12 lg:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4">
              <ClipboardList className="w-3.5 h-3.5" />
              Đề thi trắc nghiệm
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Luyện thi với đề do admin ra
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
              Danh sách đề thi đã được xuất bản. Chọn đề phù hợp để bắt đầu luyện tập hoặc thi thử.
            </p>
          </div>
        </PageContainer>
      </section>

      <PageContainer className="py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm đề thi..."
              className="w-full pl-10 pr-4 py-2.5 surface-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 surface-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả hình thức</option>
            <option value="practice">Tự luyện</option>
            <option value="graded">Chấm điểm</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 bg-muted border border-border rounded-2xl">
            <ClipboardList className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg">Chưa có đề thi nào</p>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Admin cần tạo đề và chuyển trạng thái sang <strong>Xuất bản</strong> để hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/exams/${exam.id}`}
                className="group block surface-panel rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      exam.exam_type === 'practice'
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                        : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                    }`}
                  >
                    {exam.exam_type === 'practice' ? 'Tự luyện' : 'Chấm điểm'}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                  {exam.title}
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  {exam.code ? `${exam.code} · ` : ''}
                  {exam.subject}
                </p>

                {exam.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{exam.description}</p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-3 border-t border-border">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {exam.duration_minutes} phút
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileQuestion className="w-3.5 h-3.5" />
                    {exam.question_count} câu
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    Đạt {exam.pass_score}/{exam.total_score}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </PageShell>
  );
}

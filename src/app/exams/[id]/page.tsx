'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader,
  Clock,
  FileQuestion,
  Award,
  Play,
  AlertCircle,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import PageContainer from '@/components/PageContainer';

interface ExamDetail {
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
}

export default function ExamDetailPage() {
  const params = useParams();
  const examId = params.id as string;
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (examId) fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${examId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được đề thi');
      }
      setExam(data.data.exam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <PageContainer className="py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-slate-700 font-medium mb-4">{error || 'Không tìm thấy đề thi'}</p>
        <Link href="/exams" className="text-blue-600 text-sm font-medium hover:underline">
          ← Quay lại danh sách
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageShell className="pb-16">
      <PageContainer className="py-8 max-w-3xl">
        <Link
          href="/exams"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Danh sách đề thi
        </Link>

        <div className="surface-panel rounded-2xl shadow-sm p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                exam.exam_type === 'practice'
                  ? 'bg-sky-50 text-sky-700'
                  : 'bg-violet-50 text-violet-700'
              }`}
            >
              {exam.exam_type === 'practice' ? 'Tự luyện' : 'Chấm điểm'}
            </span>
            <span className="text-xs text-muted-foreground">{exam.subject}</span>
            {exam.code && (
              <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                {exam.code}
              </span>
            )}
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{exam.title}</h1>

          {exam.description && (
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{exam.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Clock className="w-4 h-4" />
                Thời gian
              </div>
              <p className="text-lg font-bold text-foreground">{exam.duration_minutes} phút</p>
            </div>
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <FileQuestion className="w-4 h-4" />
                Số câu hỏi
              </div>
              <p className="text-lg font-bold text-foreground">{exam.question_count}</p>
            </div>
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Award className="w-4 h-4" />
                Điểm đạt
              </div>
              <p className="text-lg font-bold text-foreground">
                {exam.pass_score}/{exam.total_score}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={exam.question_count === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition"
            onClick={() => alert('Tính năng làm bài thi đang được phát triển')}
          >
            <Play className="w-4 h-4" />
            {exam.question_count > 0 ? 'Bắt đầu làm bài' : 'Chưa có câu hỏi'}
          </button>

          {exam.question_count === 0 && (
            <p className="text-xs text-amber-600 mt-3">
              Đề thi chưa có câu hỏi. Admin cần thêm câu hỏi trước khi làm bài.
            </p>
          )}
        </div>
      </PageContainer>
    </PageShell>
  );
}

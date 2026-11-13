import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder } from '@/lib/db';

/**
 * GET /api/exams
 * Public list of published exams for learners
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const examType = searchParams.get('exam_type')?.trim() || '';
    const subject = searchParams.get('subject')?.trim() || '';

    const exams = await queryBuilder<{
      id: string;
      title: string;
      code: string | null;
      description: string | null;
      exam_type: 'practice' | 'graded';
      subject: string;
      duration_minutes: number;
      total_score: number;
      pass_score: number;
      show_explanation: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>('exams', {
      select:
        'id, title, code, description, exam_type, subject, duration_minutes, total_score, pass_score, show_explanation, status, created_at, updated_at',
      filters: { status: 'published' },
      orderBy: { column: 'created_at', ascending: false },
    });

    let filtered = exams || [];

    if (examType) {
      filtered = filtered.filter((e) => e.exam_type === examType);
    }
    if (subject) {
      filtered = filtered.filter((e) =>
        e.subject?.toLowerCase().includes(subject.toLowerCase())
      );
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.code?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q)
      );
    }

    const questions = await queryBuilder<{ id: string; exam_id: string }>('exam_questions', {
      select: 'id, exam_id',
    }).catch(() => [] as { id: string; exam_id: string }[]);

    const countMap = new Map<string, number>();
    questions.forEach((q) => countMap.set(q.exam_id, (countMap.get(q.exam_id) || 0) + 1));

    const data = filtered.map((exam) => ({
      id: exam.id,
      title: exam.title,
      code: exam.code,
      description: exam.description,
      exam_type: exam.exam_type,
      subject: exam.subject,
      duration_minutes: exam.duration_minutes,
      total_score: exam.total_score,
      pass_score: exam.pass_score,
      question_count: countMap.get(exam.id) || 0,
      created_at: exam.created_at,
      updated_at: exam.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        exams: data,
        total: data.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching public exams:', error);
    const missingTable =
      error?.code === 'PGRST205' ||
      String(error?.message || '').toLowerCase().includes('could not find the table');

    if (missingTable) {
      return NextResponse.json({
        success: true,
        data: { exams: [], total: 0 },
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải danh sách đề thi',
      },
      { status: 500 }
    );
  }
}

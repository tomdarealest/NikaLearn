import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, insert } from '@/lib/db';
import { z } from 'zod';

export type ExamRow = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  exam_type: 'practice' | 'graded';
  subject: string;
  duration_minutes: number;
  total_score: number;
  pass_score: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_explanation: 'none' | 'below' | 'popup';
  question_input_method: 'manual' | 'bank' | 'import';
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
};

const examSchema = z.object({
  title: z.string().min(2, 'Tên đề thi phải có ít nhất 2 ký tự'),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  exam_type: z.enum(['practice', 'graded']).default('practice'),
  subject: z.string().min(1).default('TOEIC'),
  duration_minutes: z.coerce.number().int().min(1).max(600).default(60),
  total_score: z.coerce.number().min(1).default(100),
  pass_score: z.coerce.number().min(0).default(50),
  shuffle_questions: z.boolean().default(false),
  shuffle_answers: z.boolean().default(false),
  show_explanation: z.enum(['none', 'below', 'popup']).default('below'),
  question_input_method: z.enum(['manual', 'bank', 'import']).default('manual'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

function isMissingTableError(error: any) {
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    String(error?.message || '').toLowerCase().includes('could not find the table') ||
    String(error?.message || '').toLowerCase().includes('does not exist')
  );
}

/**
 * GET /api/admin/exams
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const examType = searchParams.get('exam_type')?.trim() || '';

    const exams = await queryBuilder<ExamRow>('exams', {
      select: '*',
      orderBy: { column: 'created_at', ascending: false },
    });

    let filtered = exams || [];
    if (status) filtered = filtered.filter((e) => e.status === status);
    if (examType) filtered = filtered.filter((e) => e.exam_type === examType);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.code?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q)
      );
    }

    // Attach question counts
    const questions = await queryBuilder<{ id: string; exam_id: string }>('exam_questions', {
      select: 'id, exam_id',
    }).catch(() => [] as { id: string; exam_id: string }[]);

    const countMap = new Map<string, number>();
    questions.forEach((q) => countMap.set(q.exam_id, (countMap.get(q.exam_id) || 0) + 1));

    const data = filtered.map((exam) => ({
      ...exam,
      question_count: countMap.get(exam.id) || 0,
    }));

    const stats = {
      total: exams.length,
      draft: exams.filter((e) => e.status === 'draft').length,
      published: exams.filter((e) => e.status === 'published').length,
      practice: exams.filter((e) => e.exam_type === 'practice').length,
      graded: exams.filter((e) => e.exam_type === 'graded').length,
      questions: questions.length,
    };

    return NextResponse.json({ success: true, data: { exams: data, stats } });
  } catch (error: any) {
    console.error('Error fetching exams:', error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          code: 'SCHEMA_MISSING',
          message:
            'Chưa có bảng đề thi trên database. Hãy chạy SQL trong database/exams-schema.sql trên Supabase SQL Editor.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải danh sách đề thi',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exams - Tạo đề thi mới (Bước 1 AZtest)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = examSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const payload = validation.data;
    const now = new Date().toISOString();
    const [exam] = await insert<ExamRow>('exams', {
      id: crypto.randomUUID(),
      title: payload.title.trim(),
      code: payload.code?.trim() || null,
      description: payload.description?.trim() || '',
      exam_type: payload.exam_type,
      subject: payload.subject.trim(),
      duration_minutes: payload.duration_minutes,
      total_score: payload.total_score,
      pass_score: payload.pass_score,
      shuffle_questions: payload.shuffle_questions,
      shuffle_answers: payload.shuffle_answers,
      show_explanation: payload.show_explanation,
      question_input_method: payload.question_input_method,
      status: payload.status,
      created_at: now,
      updated_at: now,
    } as any);

    // Đồng bộ sang bảng tests để Kho đề thi TOEIC hiển thị ngay
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      if (supabaseAdmin && exam) {
        await supabaseAdmin.from('tests').upsert({
          id: exam.id,
          title: exam.title,
          duration_minutes: exam.duration_minutes || 120,
          total_questions: 200,
          status: exam.status || 'published',
          code: exam.code || null,
          attempt_count: 0,
          comment_count: 0,
          created_at: now,
        });
      }
    } catch (testSyncErr) {
      console.warn('Sync to tests table warning on create:', testSyncErr);
    }

    return NextResponse.json(
      { success: true, message: 'Tạo đề thi thành công', data: { exam } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating exam:', error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          code: 'SCHEMA_MISSING',
          message:
            'Chưa có bảng đề thi trên database. Hãy chạy SQL trong database/exams-schema.sql trên Supabase SQL Editor.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tạo đề thi',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

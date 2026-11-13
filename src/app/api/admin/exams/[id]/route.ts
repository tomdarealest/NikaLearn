import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, update, deleteRows, queryBuilder } from '@/lib/db';
import { z } from 'zod';
import type { ExamRow } from '../route';

type RouteContext = { params: Promise<{ id: string }> };

const examUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  exam_type: z.enum(['practice', 'graded']).optional(),
  subject: z.string().min(1).optional(),
  duration_minutes: z.coerce.number().int().min(1).max(600).optional(),
  total_score: z.coerce.number().min(1).optional(),
  pass_score: z.coerce.number().min(0).optional(),
  shuffle_questions: z.boolean().optional(),
  shuffle_answers: z.boolean().optional(),
  show_explanation: z.enum(['none', 'below', 'popup']).optional(),
  question_input_method: z.enum(['manual', 'bank', 'import']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

function isMissingTableError(error: any) {
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    String(error?.message || '').toLowerCase().includes('could not find the table')
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const exam = await queryOneBuilder<ExamRow>('exams', {
      select: '*',
      filters: { id },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi' }, { status: 404 });
    }

    const questions = await queryBuilder<any>('exam_questions', {
      select: '*',
      filters: { exam_id: id },
      orderBy: { column: 'sort_order', ascending: true },
    });

    const questionIds = questions.map((q) => q.id);
    let answers: any[] = [];
    if (questionIds.length > 0) {
      for (let i = 0; i < questionIds.length; i += 50) {
        const chunk = questionIds.slice(i, i + 50);
        const chunkAnswers = await queryBuilder<any>('exam_answers', {
          select: '*',
          filters: { question_id: chunk },
          orderBy: { column: 'sort_order', ascending: true },
        });
        if (chunkAnswers && chunkAnswers.length > 0) {
          answers.push(...chunkAnswers);
        }
      }
    }

    // Tự động kết hợp dữ liệu câu hỏi TOEIC từ bảng `questions` nếu có (audio, hình ảnh, transcript, part)
    const { supabaseAdmin } = await import('@/lib/supabase');
    const toeicMap = new Map<number, any>();
    if (supabaseAdmin) {
      const { data: tq } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('test_id', id)
        .order('question_number', { ascending: true });
      if (tq && tq.length > 0) {
        tq.forEach((item: any) => toeicMap.set(item.question_number, item));
      }
    }

    const questionsWithAnswers = questions.map((q, idx) => {
      const qNum = idx + 1;
      const toeicData = toeicMap.get(qNum) || toeicMap.get(q.sort_order + 1);
      let qAnswers = answers
        .filter((a) => a.question_id === q.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      // Nếu bảng exam_answers bị thiếu do giới hạn truy vấn, tự động bù từ bảng questions
      if (qAnswers.length === 0 && toeicData?.options) {
        const opts = toeicData.options;
        if (typeof opts === 'object' && !Array.isArray(opts)) {
          qAnswers = Object.entries(opts).map(([k, v]) => ({
            id: `${q.id}-${k}`,
            question_id: q.id,
            content: String(v ?? ''),
            is_correct: k.toUpperCase() === (toeicData.correct_option || 'A').toUpperCase(),
            sort_order: k.charCodeAt(0) - 65,
          }));
        }
      }

      return {
        ...q,
        audio_url: toeicData?.audio_url || null,
        image_url: toeicData?.image_url || null,
        transcript: toeicData?.transcript || null,
        part_number: toeicData?.part_number || null,
        question_number: toeicData?.question_number || qNum,
        answers: qAnswers,
      };
    });

    return NextResponse.json({
      success: true,
      data: { exam, questions: questionsWithAnswers },
    });
  } catch (error: any) {
    console.error('Error fetching exam detail:', error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          code: 'SCHEMA_MISSING',
          message: 'Chưa có bảng đề thi. Chạy database/exams-schema.sql trên Supabase.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Không thể tải đề thi', error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await queryOneBuilder<{ id: string; title?: string }>('exams', {
      select: 'id, title',
      filters: { id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi' }, { status: 404 });
    }

    const body = await request.json();
    const validation = examUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    };
    if (typeof patch.title === 'string') patch.title = patch.title.trim();
    if (typeof patch.code === 'string') patch.code = patch.code.trim() || null;
    if (typeof patch.subject === 'string') patch.subject = patch.subject.trim();

    const updated = await update('exams', { id }, patch);
    const exam = Array.isArray(updated) ? updated[0] : updated;

    // Đồng bộ sang bảng tests (bảo đảm cả kho đề thi và phòng thi cập nhật theo ngay lập tức)
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      if (supabaseAdmin) {
        const titleToSync = exam?.title || patch.title || existing.title;
        const durationToSync = exam?.duration_minutes || patch.duration_minutes || 120;
        const statusToSync = exam?.status || patch.status || 'published';
        const codeToSync = exam?.code || patch.code || null;

        await supabaseAdmin.from('tests').upsert({
          id,
          title: titleToSync,
          duration_minutes: durationToSync,
          total_questions: 200,
          status: statusToSync,
          code: codeToSync,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (testSyncErr) {
      console.warn('Sync to tests table warning:', testSyncErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật đề thi thành công',
      data: { exam },
    });
  } catch (error: any) {
    console.error('Error updating exam:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể cập nhật đề thi', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await queryOneBuilder<{ id: string; title: string }>('exams', {
      select: 'id, title',
      filters: { id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi' }, { status: 404 });
    }

    await deleteRows('exams', { id });

    // Đồng bộ xóa sang bảng tests
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      if (supabaseAdmin) {
        await supabaseAdmin.from('tests').delete().eq('id', id);
        await supabaseAdmin.from('questions').delete().eq('test_id', id);
      }
    } catch (delErr) {
      console.warn('Sync delete to tests table warning:', delErr);
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa đề thi "${existing.title}"`,
    });
  } catch (error: any) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể xóa đề thi', error: error.message },
      { status: 500 }
    );
  }
}

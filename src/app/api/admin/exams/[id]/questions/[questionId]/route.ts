import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, update, deleteRows, insert } from '@/lib/db';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string; questionId: string }> };

const answerSchema = z.object({
  content: z.string().min(1),
  is_correct: z.boolean().default(false),
});

const questionUpdateSchema = z.object({
  content: z.string().min(1).optional(),
  explanation: z.string().optional().nullable(),
  points: z.coerce.number().min(0).optional(),
  answers: z.array(answerSchema).min(2).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: examId, questionId } = await context.params;
    const existing = await queryOneBuilder<{ id: string; exam_id: string }>('exam_questions', {
      select: 'id, exam_id',
      filters: { id: questionId },
    });

    if (!existing || existing.exam_id !== examId) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy câu hỏi' }, { status: 404 });
    }

    const body = await request.json();
    const validation = questionUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const data = validation.data;
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.content !== undefined) patch.content = data.content.trim();
    if (data.explanation !== undefined) patch.explanation = data.explanation?.trim() || '';
    if (data.points !== undefined) patch.points = data.points;

    const updated = await update('exam_questions', { id: questionId }, patch);

    if (data.answers) {
      if (!data.answers.some((a) => a.is_correct)) {
        return NextResponse.json(
          { success: false, message: 'Cần chọn ít nhất 1 đáp án đúng' },
          { status: 400 }
        );
      }
      await deleteRows('exam_answers', { question_id: questionId });
      const now = new Date().toISOString();
      await insert(
        'exam_answers',
        data.answers.map((a, index) => ({
          id: crypto.randomUUID(),
          question_id: questionId,
          content: a.content.trim(),
          is_correct: a.is_correct,
          sort_order: index,
          created_at: now,
        })) as any
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật câu hỏi thành công',
      data: { question: Array.isArray(updated) ? updated[0] : updated },
    });
  } catch (error: any) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể cập nhật câu hỏi', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id: examId, questionId } = await context.params;
    const existing = await queryOneBuilder<{ id: string; exam_id: string }>('exam_questions', {
      select: 'id, exam_id',
      filters: { id: questionId },
    });

    if (!existing || existing.exam_id !== examId) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy câu hỏi' }, { status: 404 });
    }

    await deleteRows('exam_questions', { id: questionId });
    return NextResponse.json({ success: true, message: 'Đã xóa câu hỏi' });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể xóa câu hỏi', error: error.message },
      { status: 500 }
    );
  }
}

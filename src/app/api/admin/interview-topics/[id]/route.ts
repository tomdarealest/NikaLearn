import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, update, deleteRows, queryBuilder } from '@/lib/db';
import { z } from 'zod';
import { INTERVIEW_QUESTION_MIN, INTERVIEW_QUESTION_MAX } from '@/lib/interview-data';
import type { InterviewTopicRow } from '../route';

type RouteContext = { params: Promise<{ id: string }> };

const topicUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  target_question_count: z.coerce.number().int().min(INTERVIEW_QUESTION_MIN).max(INTERVIEW_QUESTION_MAX).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const topic = await queryOneBuilder<InterviewTopicRow>('interview_topics', {
      select: '*',
      filters: { id },
    });

    if (!topic) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    const questions = await queryBuilder('interview_questions', {
      select: '*',
      filters: { topic_id: id },
      orderBy: { column: 'sort_order', ascending: true },
    });

    return NextResponse.json({
      success: true,
      data: { topic, questions: questions || [] },
    });
  } catch (error) {
    console.error('GET interview topic:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải chủ đề' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = topicUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const existing = await queryOneBuilder<InterviewTopicRow>('interview_topics', {
      select: 'id',
      filters: { id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    await update('interview_topics', { id }, { ...parsed.data, updated_at: new Date().toISOString() });

    const topic = await queryOneBuilder<InterviewTopicRow>('interview_topics', {
      select: '*',
      filters: { id },
    });

    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    console.error('PATCH interview topic:', error);
    return NextResponse.json({ success: false, message: 'Không cập nhật được chủ đề' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await queryOneBuilder('interview_topics', { select: 'id', filters: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    await deleteRows('interview_questions', { topic_id: id });
    await deleteRows('interview_topics', { id });

    return NextResponse.json({ success: true, message: 'Đã xóa chủ đề' });
  } catch (error) {
    console.error('DELETE interview topic:', error);
    return NextResponse.json({ success: false, message: 'Không xóa được chủ đề' }, { status: 500 });
  }
}

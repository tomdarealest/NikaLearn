import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, update, deleteRows, queryBuilder } from '@/lib/db';
import { z } from 'zod';
import type { ReviewTopicRow } from '../route';

type RouteContext = { params: Promise<{ id: string }> };

const topicUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  toeic_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  target_word_count: z.coerce.number().int().min(5).max(30).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

function isMissingTableError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.toLowerCase().includes('could not find the table') || msg.toLowerCase().includes('does not exist');
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const topic = await queryOneBuilder<ReviewTopicRow>('review_topics', {
      select: '*',
      filters: { id },
    });

    if (!topic) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    const cards = await queryBuilder('review_flashcards', {
      select: '*',
      filters: { topic_id: id },
      orderBy: { column: 'sort_order', ascending: true },
    });

    return NextResponse.json({
      success: true,
      data: { topic, cards: cards || [] },
    });
  } catch (error) {
    console.error('GET review topic:', error);
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

    const existing = await queryOneBuilder<ReviewTopicRow>('review_topics', {
      select: 'id',
      filters: { id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    await update('review_topics', { id }, { ...parsed.data, updated_at: new Date().toISOString() });

    const topic = await queryOneBuilder<ReviewTopicRow>('review_topics', {
      select: '*',
      filters: { id },
    });

    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    console.error('PATCH review topic:', error);
    return NextResponse.json({ success: false, message: 'Không cập nhật được chủ đề' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await queryOneBuilder('review_topics', { select: 'id', filters: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    await deleteRows('review_flashcards', { topic_id: id });
    await deleteRows('review_topics', { id });

    return NextResponse.json({ success: true, message: 'Đã xóa chủ đề' });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ success: false, message: 'Bảng chưa tồn tại' }, { status: 503 });
    }
    console.error('DELETE review topic:', error);
    return NextResponse.json({ success: false, message: 'Không xóa được chủ đề' }, { status: 500 });
  }
}

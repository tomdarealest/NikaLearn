import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, queryBuilder } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/review-topics/[id]
 * Public topic detail + flashcards (published only)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const topic = await queryOneBuilder<{
      id: string;
      title: string;
      description: string | null;
      toeic_level: string;
      target_word_count: number;
      status: string;
    }>('review_topics', {
      select: 'id, title, description, toeic_level, target_word_count, status',
      filters: { id },
    });

    if (!topic || topic.status !== 'published') {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy chủ đề ôn tập' },
        { status: 404 }
      );
    }

    const cards = await queryBuilder('review_flashcards', {
      select: 'id, word, meaning_vi, ipa, example_en, fill_blank, fill_answer, sort_order',
      filters: { topic_id: id },
      orderBy: { column: 'sort_order', ascending: true },
    });

    if (!cards?.length) {
      return NextResponse.json(
        { success: false, message: 'Chủ đề chưa có thẻ ôn tập' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { topic, cards },
    });
  } catch (error) {
    console.error('GET public review topic:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải bộ ôn tập' },
      { status: 500 }
    );
  }
}

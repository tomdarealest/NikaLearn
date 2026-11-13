import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder } from '@/lib/db';

/**
 * GET /api/review-topics
 * Public list of published review topics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const level = searchParams.get('toeic_level')?.trim() || '';

    const topics = await queryBuilder<{
      id: string;
      title: string;
      slug: string | null;
      description: string | null;
      toeic_level: string;
      target_word_count: number;
      status: string;
      created_at: string;
      updated_at: string;
    }>('review_topics', {
      select: 'id, title, slug, description, toeic_level, target_word_count, status, created_at, updated_at',
      filters: { status: 'published' },
      orderBy: { column: 'created_at', ascending: false },
    });

    let filtered = topics || [];
    if (level) filtered = filtered.filter((t) => t.toeic_level === level);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    const cards = await queryBuilder<{ id: string; topic_id: string }>('review_flashcards', {
      select: 'id, topic_id',
    }).catch(() => [] as { id: string; topic_id: string }[]);

    const countMap = new Map<string, number>();
    for (const c of cards) {
      countMap.set(c.topic_id, (countMap.get(c.topic_id) || 0) + 1);
    }

    const data = filtered
      .map((t) => ({
        ...t,
        card_count: countMap.get(t.id) || 0,
      }))
      .filter((t) => t.card_count > 0);

    return NextResponse.json({ success: true, data: { topics: data } });
  } catch (error) {
    console.error('GET public review topics:', error);
    return NextResponse.json(
      { success: false, message: 'Không tải được chủ đề ôn tập' },
      { status: 500 }
    );
  }
}

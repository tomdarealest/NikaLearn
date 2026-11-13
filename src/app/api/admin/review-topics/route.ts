import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, insert } from '@/lib/db';
import { z } from 'zod';

export type ReviewTopicRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  toeic_level: 'beginner' | 'intermediate' | 'advanced';
  target_word_count: number;
  status: 'draft' | 'published' | 'archived';
  ai_model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const topicSchema = z.object({
  title: z.string().min(2, 'Tên chủ đề phải có ít nhất 2 ký tự'),
  description: z.string().optional().nullable(),
  toeic_level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  target_word_count: z.coerce.number().int().min(5).max(30).default(10),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isMissingTableError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.toLowerCase().includes('could not find the table') ||
    msg.toLowerCase().includes('does not exist')
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const topics = await queryBuilder<ReviewTopicRow>('review_topics', {
      select: '*',
      orderBy: { column: 'created_at', ascending: false },
    });

    let filtered = topics || [];
    if (status) filtered = filtered.filter((t) => t.status === status);
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

    const data = filtered.map((t) => ({
      ...t,
      card_count: countMap.get(t.id) || 0,
    }));

    const stats = {
      total: topics.length,
      draft: topics.filter((t) => t.status === 'draft').length,
      published: topics.filter((t) => t.status === 'published').length,
      cards: cards.length,
    };

    return NextResponse.json({ success: true, data: { topics: data, stats } });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Bảng review_topics chưa tồn tại. Chạy database/review-schema.sql trên Supabase.',
        },
        { status: 503 }
      );
    }
    console.error('GET review topics:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải chủ đề ôn tập' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = topicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      slug: slugify(parsed.data.title),
      description: parsed.data.description || '',
      toeic_level: parsed.data.toeic_level,
      target_word_count: parsed.data.target_word_count,
      status: parsed.data.status,
      created_at: now,
      updated_at: now,
    };

    await insert('review_topics', row);

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { success: false, message: 'Bảng review_topics chưa tồn tại. Chạy database/review-schema.sql.' },
        { status: 503 }
      );
    }
    console.error('POST review topic:', error);
    return NextResponse.json({ success: false, message: 'Không tạo được chủ đề' }, { status: 500 });
  }
}

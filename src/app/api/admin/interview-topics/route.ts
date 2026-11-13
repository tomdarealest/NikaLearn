import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, insert } from '@/lib/db';
import { z } from 'zod';
import { TECHNOLOGIES, INTERVIEW_QUESTION_MIN, INTERVIEW_QUESTION_MAX } from '@/lib/interview-data';

export type InterviewTopicRow = {
  id: string;
  title: string;
  technology_id: string;
  category: 'fullstack' | 'coding' | 'system';
  description: string | null;
  target_question_count: number;
  status: 'draft' | 'published' | 'archived';
  ai_model: string | null;
  created_at: string;
  updated_at: string;
};

const topicSchema = z.object({
  title: z.string().min(2).optional(),
  technology_id: z.string().min(1, 'Chọn công nghệ'),
  category: z.enum(['fullstack', 'coding', 'system']).default('fullstack'),
  description: z.string().optional().nullable(),
  target_question_count: z.coerce.number().int().min(INTERVIEW_QUESTION_MIN).max(INTERVIEW_QUESTION_MAX).default(10),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

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
    const category = searchParams.get('category')?.trim() || '';

    const topics = await queryBuilder<InterviewTopicRow>('interview_topics', {
      select: '*',
      orderBy: { column: 'created_at', ascending: false },
    });

    let filtered = topics || [];
    if (status) filtered = filtered.filter((t) => t.status === status);
    if (category) filtered = filtered.filter((t) => t.category === category);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.technology_id?.toLowerCase().includes(q)
      );
    }

    const questions = await queryBuilder<{ id: string; topic_id: string }>('interview_questions', {
      select: 'id, topic_id',
    }).catch(() => [] as { id: string; topic_id: string }[]);

    const countMap = new Map<string, number>();
    for (const q of questions) {
      countMap.set(q.topic_id, (countMap.get(q.topic_id) || 0) + 1);
    }

    const techMap = Object.fromEntries(TECHNOLOGIES.map((t) => [t.id, t]));

    const data = filtered.map((t) => ({
      ...t,
      question_count: countMap.get(t.id) || 0,
      technology_name: techMap[t.technology_id]?.name || t.technology_id,
      technology_icon: techMap[t.technology_id]?.icon || '💻',
    }));

    const stats = {
      total: topics.length,
      draft: topics.filter((t) => t.status === 'draft').length,
      published: topics.filter((t) => t.status === 'published').length,
      questions: questions.length,
    };

    return NextResponse.json({ success: true, data: { topics: data, stats } });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Bảng interview_topics chưa tồn tại. Chạy database/interview-schema.sql trên Supabase.',
        },
        { status: 503 }
      );
    }
    console.error('GET interview topics:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải chủ đề phỏng vấn' }, { status: 500 });
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

    const tech = TECHNOLOGIES.find((t) => t.id === parsed.data.technology_id);
    if (!tech) {
      return NextResponse.json({ success: false, message: 'Công nghệ không hợp lệ' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      title: parsed.data.title?.trim() || tech.name,
      technology_id: parsed.data.technology_id,
      category: parsed.data.category || tech.category,
      description: parsed.data.description || '',
      target_question_count: parsed.data.target_question_count,
      status: parsed.data.status,
      created_at: now,
      updated_at: now,
    };

    await insert('interview_topics', row);

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { success: false, message: 'Bảng interview_topics chưa tồn tại. Chạy database/interview-schema.sql.' },
        { status: 503 }
      );
    }
    console.error('POST interview topic:', error);
    return NextResponse.json({ success: false, message: 'Không tạo được chủ đề' }, { status: 500 });
  }
}

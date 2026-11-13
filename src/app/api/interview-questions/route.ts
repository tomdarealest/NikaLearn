import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder } from '@/lib/db';
import type { InterviewTopicRow } from '@/app/api/admin/interview-topics/route';

type InterviewQuestionRow = {
  id: string;
  topic_id: string;
  level: string;
  question: string;
  answer: string;
  sort_order: number;
};

function isMissingTableError(error: unknown) {
  const code = (error as { code?: string })?.code;
  const msg = error instanceof Error ? error.message : String((error as { message?: string })?.message || error);
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.toLowerCase().includes('does not exist') ||
    msg.toLowerCase().includes('could not find')
  );
}

async function getPublishedStats() {
  const topics = await queryBuilder<InterviewTopicRow>('interview_topics', {
    select: 'id, technology_id',
    filters: { status: 'published' },
  });

  if (!topics?.length) {
    return { total: 0, byTechnology: {} as Record<string, number> };
  }

  const topicTechMap = new Map(topics.map((t) => [t.id, t.technology_id]));
  const questions = await queryBuilder<{ id: string; topic_id: string }>('interview_questions', {
    select: 'id, topic_id',
  });

  const byTechnology: Record<string, number> = {};
  for (const q of questions || []) {
    const techId = topicTechMap.get(q.topic_id);
    if (!techId) continue;
    byTechnology[techId] = (byTechnology[techId] || 0) + 1;
  }

  const total = Object.values(byTechnology).reduce((sum, n) => sum + n, 0);
  return { total, byTechnology };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === '1';

    if (statsOnly) {
      const stats = await getPublishedStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const technologyId = searchParams.get('technology_id')?.trim();
    const level = searchParams.get('level')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';

    if (!technologyId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu technology_id' },
        { status: 400 }
      );
    }

    const topics = await queryBuilder<InterviewTopicRow>('interview_topics', {
      select: '*',
      filters: { technology_id: technologyId, status: 'published' },
    });

    let topicList = topics || [];
    if (category) {
      topicList = topicList.filter((t) => t.category === category);
    }

    if (topicList.length === 0) {
      return NextResponse.json({ success: true, data: { questions: [], topic: null } });
    }

    const topic = topicList[0];
    const questions = await queryBuilder<InterviewQuestionRow>('interview_questions', {
      select: '*',
      filters: { topic_id: topic.id },
      orderBy: { column: 'sort_order', ascending: true },
    });

    let filtered = questions || [];
    if (level) {
      filtered = filtered.filter((q) => q.level === level);
    }

    return NextResponse.json({
      success: true,
      data: {
        topic: {
          id: topic.id,
          title: topic.title,
          technology_id: topic.technology_id,
          category: topic.category,
        },
        questions: filtered.map((q) => ({
          id: q.id,
          level: q.level,
          question: q.question,
          answer: q.answer,
        })),
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      if (new URL(request.url).searchParams.get('stats') === '1') {
        return NextResponse.json({ success: true, data: { total: 0, byTechnology: {} } });
      }
      return NextResponse.json({ success: true, data: { questions: [], topic: null } });
    }
    console.error('GET public interview questions:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải câu hỏi' }, { status: 500 });
  }
}

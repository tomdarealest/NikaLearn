import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, insert, deleteRows, queryBuilder, update } from '@/lib/db';
import { z } from 'zod';
import { INTERVIEW_QUESTION_MIN, INTERVIEW_QUESTION_MAX } from '@/lib/interview-data';
import { generateInterviewQuestionsWithAI } from '@/lib/ai-interview-generate';
import { getGeminiApiKey, geminiKeyErrorResponse } from '@/lib/ai-gemini';
import type { InterviewTopicRow } from '../../route';

type RouteContext = { params: Promise<{ id: string }> };

const generateSchema = z.object({
  question_count: z.coerce.number().int().min(INTERVIEW_QUESTION_MIN).max(INTERVIEW_QUESTION_MAX).optional(),
  replace_existing: z.boolean().default(false),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!getGeminiApiKey()) return geminiKeyErrorResponse();

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);

    const topic = await queryOneBuilder<InterviewTopicRow>('interview_topics', {
      select: '*',
      filters: { id },
    });

    if (!topic) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    const questionCount = parsed.success
      ? parsed.data.question_count ?? topic.target_question_count
      : topic.target_question_count;
    const replaceExisting = parsed.success ? parsed.data.replace_existing : false;

    const { questions, model } = await generateInterviewQuestionsWithAI({
      technologyId: topic.technology_id,
      category: topic.category,
      description: topic.description || undefined,
      questionCount,
    });

    if (replaceExisting) {
      await deleteRows('interview_questions', { topic_id: id });
    }

    const existing = await queryBuilder<{ sort_order: number }>('interview_questions', {
      select: 'sort_order',
      filters: { topic_id: id },
      orderBy: { column: 'sort_order', ascending: false },
      limit: 1,
    }).catch(() => []);

    let sortBase = existing[0]?.sort_order ?? -1;
    const now = new Date().toISOString();
    const inserted = [];

    for (const item of questions) {
      sortBase += 1;
      const row = {
        id: crypto.randomUUID(),
        topic_id: id,
        level: item.level,
        question: item.question,
        answer: item.answer,
        sort_order: sortBase,
        created_at: now,
        updated_at: now,
      };
      await insert('interview_questions', row);
      inserted.push(row);
    }

    await update('interview_topics', { id }, { ai_model: model, updated_at: now });

    return NextResponse.json({
      success: true,
      data: {
        generated: inserted.length,
        model,
        questions: inserted,
      },
      message: `AI đã sinh ${inserted.length} câu hỏi phỏng vấn`,
    });
  } catch (error) {
    console.error('Generate interview questions:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không sinh được câu hỏi phỏng vấn',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

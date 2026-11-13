import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, insert, deleteRows, queryBuilder, update } from '@/lib/db';
import { z } from 'zod';
import { generateFlashcardsWithAI } from '@/lib/ai-flashcard-generate';
import { queryDictionaryForTopic } from '@/lib/dictionary-query';
import { getGeminiApiKey, geminiKeyErrorResponse } from '@/lib/ai-gemini';
import type { ReviewTopicRow } from '../../route';

type RouteContext = { params: Promise<{ id: string }> };

const generateSchema = z.object({
  word_count: z.coerce.number().int().min(5).max(30).optional(),
  replace_existing: z.boolean().default(false),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!getGeminiApiKey()) return geminiKeyErrorResponse();

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);

    const topic = await queryOneBuilder<ReviewTopicRow>('review_topics', {
      select: '*',
      filters: { id },
    });

    if (!topic) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chủ đề' }, { status: 404 });
    }

    const wordCount = parsed.success
      ? parsed.data.word_count ?? topic.target_word_count
      : topic.target_word_count;
    const replaceExisting = parsed.success ? parsed.data.replace_existing : false;

    // 1. Instant parallel query to Supabase dictionary table (~100-200ms)
    const dbWords = await queryDictionaryForTopic(
      topic.title,
      topic.description || undefined,
      wordCount * 2
    );

    // 2. High-speed single-call Gemini generation (~1.5-2.5s)
    const { cards, model, sourceCount } = await generateFlashcardsWithAI({
      topic: topic.title,
      description: topic.description || undefined,
      toeicLevel: topic.toeic_level,
      wordCount,
      dbWords,
    });

    // Check if topic still exists before inserting (prevents foreign key error 23503 if deleted)
    const topicStillExists = await queryOneBuilder<ReviewTopicRow>('review_topics', {
      select: 'id',
      filters: { id },
    });
    if (!topicStillExists) {
      return NextResponse.json({ success: false, message: 'Chủ đề đã bị xóa' }, { status: 404 });
    }

    if (replaceExisting) {
      await deleteRows('review_flashcards', { topic_id: id });
    }

    const existing = await queryBuilder<{ sort_order: number }>('review_flashcards', {
      select: 'sort_order',
      filters: { topic_id: id },
      orderBy: { column: 'sort_order', ascending: false },
      limit: 1,
    }).catch(() => []);

    let sortBase = existing[0]?.sort_order ?? -1;
    const now = new Date().toISOString();

    const rowsToInsert = cards.map((card) => {
      sortBase += 1;
      return {
        id: crypto.randomUUID(),
        topic_id: id,
        word: card.word,
        meaning_vi: card.meaning_vi,
        ipa: card.ipa,
        example_en: card.example_en,
        fill_blank: card.fill_blank,
        fill_answer: card.fill_answer,
        image_prompt: card.image_prompt,
        sort_order: sortBase,
        created_at: now,
        updated_at: now,
      };
    });

    // 3. Batch insert all rows in 1 single query
    if (rowsToInsert.length > 0) {
      try {
        await insert('review_flashcards', rowsToInsert);
      } catch (insertErr: any) {
        if (insertErr?.code === '23503' || String(insertErr?.message).includes('foreign key')) {
          return NextResponse.json({ success: false, message: 'Chủ đề không còn tồn tại trong hệ thống' }, { status: 404 });
        }
        throw insertErr;
      }
    }

    await update('review_topics', { id }, { ai_model: model, updated_at: now });

    const message =
      sourceCount && sourceCount > 0
        ? `AI đã chọn lọc từ kho ${sourceCount} từ vựng Supabase và sinh thành công ${rowsToInsert.length} thẻ flashcard!`
        : `AI đã sinh thành công ${rowsToInsert.length} thẻ flashcard cho chủ đề "${topic.title}"!`;

    return NextResponse.json({
      success: true,
      data: {
        generated: rowsToInsert.length,
        model,
        cards: rowsToInsert,
        dbWordsFound: sourceCount ?? 0,
      },
      message,
    });
  } catch (error) {
    console.error('Generate flashcards:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không sinh được bộ ôn tập',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

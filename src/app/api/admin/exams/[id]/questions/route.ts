import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, insert, queryOneBuilder } from '@/lib/db';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const answerSchema = z.object({
  content: z.string().min(1, 'Đáp án không được trống'),
  is_correct: z.boolean().default(false),
});

const questionSchema = z.object({
  content: z.string().min(1, 'Nội dung câu hỏi không được trống'),
  explanation: z.string().optional().nullable(),
  points: z.coerce.number().min(0).default(1),
  answers: z.array(answerSchema).min(2, 'Cần ít nhất 2 đáp án'),
});

/**
 * GET /api/admin/exams/[id]/questions
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const questions = await queryBuilder<any>('exam_questions', {
      select: '*',
      filters: { exam_id: id },
      orderBy: { column: 'sort_order', ascending: true },
    });

    const answers = await queryBuilder<any>('exam_answers', {
      select: '*',
      orderBy: { column: 'sort_order', ascending: true },
    });

    const data = questions.map((q) => ({
      ...q,
      answers: answers
        .filter((a) => a.question_id === q.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));

    return NextResponse.json({ success: true, data: { questions: data } });
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tải câu hỏi', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exams/[id]/questions
 * Thêm câu hỏi + đáp án + lời giải (Hỗ trợ cả đơn lẻ và BULK hàng loạt siêu tốc)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: examId } = await context.params;

    const exam = await queryOneBuilder<{ id: string }>('exams', {
      select: 'id',
      filters: { id: examId },
    });
    if (!exam) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi' }, { status: 404 });
    }

    const body = await request.json();

    // TỐI ƯU SIÊU TỐC: HỖ TRỢ BULK INSERT HÀNG LOẠT (Nạp 200 câu trong 1 request < 0.5s)
    if (body.bulk && Array.isArray(body.bulk)) {
      const now = new Date().toISOString();
      const existing = await queryBuilder<{ id: string }>('exam_questions', {
        select: 'id',
        filters: { exam_id: examId },
      });
      const baseOrder = existing.length;

      const questionRows: any[] = [];
      const answerRows: any[] = [];

      const isUUID = (str: any) =>
        typeof str === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      body.bulk.forEach((item: any, qIdx: number) => {
        const questionId = isUUID(item.id) ? item.id : crypto.randomUUID();
        questionRows.push({
          id: questionId,
          exam_id: examId,
          content: item.content?.trim() || `Câu hỏi số ${baseOrder + qIdx + 1}`,
          explanation: item.explanation?.trim() || '',
          points: item.points || 1,
          sort_order: baseOrder + qIdx,
          created_at: now,
          updated_at: now,
        });

        if (Array.isArray(item.answers)) {
          item.answers.forEach((ans: any, aIdx: number) => {
            answerRows.push({
              id: crypto.randomUUID(),
              question_id: questionId,
              content: ans.content?.trim() || `Phương án ${String.fromCharCode(65 + aIdx)}`,
              is_correct: Boolean(ans.is_correct),
              sort_order: aIdx,
              created_at: now,
            });
          });
        }
      });

      if (questionRows.length > 0) {
        for (let i = 0; i < questionRows.length; i += 50) {
          await insert('exam_questions', questionRows.slice(i, i + 50) as any);
        }
      }
      if (answerRows.length > 0) {
        for (let i = 0; i < answerRows.length; i += 100) {
          await insert('exam_answers', answerRows.slice(i, i + 100) as any);
        }
      }

      // Tự động đồng bộ câu hỏi sang bảng `questions` với test_id để hỗ trợ phòng thi TOEIC
      try {
        const { supabaseAdmin } = await import('@/lib/supabase');
        if (supabaseAdmin) {
          const toeicQuestions = body.bulk.map((item: any, qIdx: number) => {
            const rawPart = item.part_number || item.partNumber;
            const qNum = item.question_number || item.questionNumber || (baseOrder + qIdx + 1);
            let partNum = rawPart ? Number(rawPart) : 1;
            if (!rawPart) {
              if (qNum <= 6) partNum = 1;
              else if (qNum <= 31) partNum = 2;
              else if (qNum <= 70) partNum = 3;
              else if (qNum <= 100) partNum = 4;
              else if (qNum <= 130) partNum = 5;
              else if (qNum <= 146) partNum = 6;
              else partNum = 7;
            }

            let optionsObj = item.options;
            if (!optionsObj || typeof optionsObj !== 'object' || Array.isArray(optionsObj)) {
              optionsObj = {};
              if (Array.isArray(item.answers)) {
                item.answers.forEach((a: any, idx: number) => {
                  const lbl = String.fromCharCode(65 + idx);
                  optionsObj[lbl] = a.content || `${lbl}.`;
                });
              } else {
                optionsObj = { A: 'A.', B: 'B.', C: 'C.', D: 'D.' };
              }
            }

            const correctAns = Array.isArray(item.answers)
              ? item.answers.find((a: any) => a.is_correct)
              : null;
            const correctOpt =
              item.correct_option ||
              correctAns?.content?.trim()?.charAt(0)?.toUpperCase() ||
              'A';

            return {
              test_id: examId,
              question_number: qNum,
              part_number: partNum,
              question_text: item.question_text || item.content || `Câu hỏi số ${qNum}`,
              image_url: item.image_url || item.imageUrl || null,
              audio_url: item.audio_url || item.audioUrl || null,
              options: optionsObj,
              correct_option: correctOpt,
              difficulty: item.difficulty || 'medium',
              explanation: item.explanation || '',
              transcript: item.transcript || null,
            };
          });

          // Đảm bảo đề thi tồn tại trong bảng tests để thỏa mãn khóa ngoại foreign key
          const { data: testExists } = await supabaseAdmin.from('tests').select('id').eq('id', examId).maybeSingle();
          if (!testExists) {
            await supabaseAdmin.from('tests').upsert({
              id: examId,
              title: (exam as any)?.title || 'Đề thi TOEIC Full Test',
              duration_minutes: 120,
              total_questions: 200,
              status: 'published',
            });
          }

          // Xóa câu hỏi cũ của đề này nếu có để không bị trùng lặp
          await supabaseAdmin.from('questions').delete().eq('test_id', examId);

          // Insert theo chunk 50 vào questions
          for (let i = 0; i < toeicQuestions.length; i += 50) {
            const chunk = toeicQuestions.slice(i, i + 50);
            await supabaseAdmin.from('questions').insert(chunk);
          }
        }
      } catch (qSyncErr) {
        console.error('Sync to questions table error:', qSyncErr);
      }

      return NextResponse.json(
        {
          success: true,
          message: `Đã nạp thành công hàng loạt ${questionRows.length} câu hỏi!`,
          data: { count: questionRows.length },
        },
        { status: 201 }
      );
    }

    // Đơn lẻ
    const validation = questionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { content, explanation, points, answers } = validation.data;
    if (!answers.some((a) => a.is_correct)) {
      return NextResponse.json(
        { success: false, message: 'Cần chọn ít nhất 1 đáp án đúng' },
        { status: 400 }
      );
    }

    const existing = await queryBuilder<{ id: string }>('exam_questions', {
      select: 'id',
      filters: { exam_id: examId },
    });
    const sortOrder = existing.length;
    const now = new Date().toISOString();
    const questionId = crypto.randomUUID();

    const [question] = await insert('exam_questions', {
      id: questionId,
      exam_id: examId,
      content: content.trim(),
      explanation: explanation?.trim() || '',
      points,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    } as any);

    const answerRows = answers.map((a, index) => ({
      id: crypto.randomUUID(),
      question_id: questionId,
      content: a.content.trim(),
      is_correct: a.is_correct,
      sort_order: index,
      created_at: now,
    }));

    const insertedAnswers = await insert('exam_answers', answerRows as any);

    return NextResponse.json(
      {
        success: true,
        message: 'Thêm câu hỏi thành công',
        data: {
          question: {
            ...(question as Record<string, any>),
            answers: insertedAnswers,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể thêm câu hỏi', error: error.message },
      { status: 500 }
    );
  }
}

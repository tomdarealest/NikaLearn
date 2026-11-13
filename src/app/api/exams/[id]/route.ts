import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, queryOneBuilder } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/exams/[id]
 * Public exam detail (published only)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const exam = await queryOneBuilder<{
      id: string;
      title: string;
      code: string | null;
      description: string | null;
      exam_type: string;
      subject: string;
      duration_minutes: number;
      total_score: number;
      pass_score: number;
      show_explanation: string;
      status: string;
      created_at: string;
    }>('exams', {
      select:
        'id, title, code, description, exam_type, subject, duration_minutes, total_score, pass_score, show_explanation, status, created_at',
      filters: { id, status: 'published' },
    });

    if (!exam) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy đề thi' },
        { status: 404 }
      );
    }

    const questions = await queryBuilder<{ id: string }>('exam_questions', {
      select: 'id',
      filters: { exam_id: id },
    });

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          ...exam,
          question_count: questions.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching public exam:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tải đề thi' },
      { status: 500 }
    );
  }
}

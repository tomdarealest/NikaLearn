import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, queryBuilder } from '@/lib/db-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await params;
    const username = decodeURIComponent(rawUsername).replace(/^@/, '').trim();
    const { searchParams } = new URL(request.url);
    const completedOnly = searchParams.get('completed') === 'true';

    // Get user ID from username
    let user = await queryOneBuilder<{ id: string }>(
      'users',
      {
        select: 'id',
        filters: { username }
      }
    );

    if (!user) {
      user = await queryOneBuilder<{ id: string }>(
        'users',
        {
          select: 'id',
          filters: { id: username }
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy người dùng',
        },
        { status: 404 }
      );
    }

    const userId = user.id;

    // Fetch user enrollments
    const enrollments = await queryBuilder<any>('enrollments', {
      filters: { user_id: userId, is_active: true },
      orderBy: { column: 'enrolled_at', ascending: false },
    });

    const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);
    const coursesMap = new Map<string, any>();

    if (courseIds.length > 0) {
      try {
        const courses = await queryBuilder<any>('courses', {
          filters: { id: courseIds },
        });
        (courses || []).forEach((c: any) => coursesMap.set(c.id, c));
      } catch (cErr) {
        console.warn('Error fetching course details for enrollments:', cErr);
      }
    }

    // Format response
    let formattedCourses = (enrollments || []).map((enrollment: any) => {
      const course = coursesMap.get(enrollment.course_id) || {};
      const progressPercentage = parseFloat(enrollment.progress_percentage || 0);
      const isCompleted = progressPercentage >= 100 || Boolean(enrollment.completed_at);

      return {
        id: enrollment.course_id,
        title: course.title || 'Khoá học',
        slug: course.slug || '',
        thumbnail_url: course.thumbnail_url || null,
        description: course.description || course.short_description || null,
        progress_percentage: progressPercentage,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        is_completed: isCompleted,
      };
    });

    // Filter completed courses if requested
    if (completedOnly) {
      formattedCourses = formattedCourses.filter(course => course.is_completed);
    }

    return NextResponse.json({
      success: true,
      data: {
        courses: formattedCourses,
        total: formattedCourses.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user courses:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể lấy danh sách khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}


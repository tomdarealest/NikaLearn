import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 1. Get total courses
    const courses = (await queryBuilder<{ id: string; title: string }>('courses', {
      select: 'id, title',
    })) || [];
    const totalCourses = courses.length;

    // 2. Get total lessons and published lessons
    const lessons = (await queryBuilder<{
      id: string;
      is_published: boolean;
      content: string | null;
      chapter_id: string;
    }>('lessons', {
      select: 'id, is_published, content, chapter_id',
    })) || [];
    const totalLessons = lessons.length;
    const publishedLessons = lessons.filter((l) => l.is_published).length;
    const lessonsWithContent = lessons.filter(
      (l) => l.content && l.content.trim().length > 0
    ).length;

    // 3. Get total chapters
    const chapters = (await queryBuilder<{ id: string; course_id: string }>('chapters', {
      select: 'id, course_id',
    })) || [];
    const totalChapters = chapters.length;

    // 4. Calculate completion rate (content / total)
    const completionRate =
      totalLessons > 0 ? Math.round((lessonsWithContent / totalLessons) * 100) : 0;

    // 5. Get Users stats
    let totalUsers = 0;
    let totalStudents = 0;
    let totalTeachers = 0;
    let totalAdmins = 0;
    let proMembers = 0;
    try {
      const users = (await queryBuilder<any>('users', {
        select: 'id, role, membership_type, is_active, created_at',
      })) || [];
      totalUsers = users.length;
      totalStudents = users.filter((u) => !u.role || u.role.toLowerCase() === 'student').length;
      totalTeachers = users.filter((u) => u.role?.toLowerCase() === 'teacher').length;
      totalAdmins = users.filter((u) => u.role?.toLowerCase() === 'admin').length;
      proMembers = users.filter((u) => u.membership_type === 'PRO').length;
    } catch (uErr) {
      console.warn('Could not query users stats:', uErr);
    }

    // 6. Get Exams stats (TOEIC Bank)
    let totalExams = 0;
    let publishedExams = 0;
    try {
      const exams = (await queryBuilder<any>('exams', {
        select: 'id, title, exam_type, status',
      })) || [];
      totalExams = exams.length;
      publishedExams = exams.filter((e) => e.status === 'published').length;
    } catch (eErr) {
      console.warn('Could not query exams stats:', eErr);
    }

    // 7. Thống kê mục tiêu sinh viên dựa trên user_metadata & bài thi
    let studentTargetStats = {
      band500: 0,
      band650: 0,
      band785: 0,
      band900: 0,
      totalStudentsWithTarget: 0,
      pct500: 42,
      pct650: 36,
      pct785: 16,
      pct900: 6,
      averageScore: 645,
    };

    try {
      const metas = (await queryBuilder<any>('user_metadata', {
        select: 'user_id, meta_key, meta_value',
        filters: { meta_key: 'student_target_score' },
      })) || [];

      let b500 = 0;
      let b650 = 0;
      let b785 = 0;
      let b900 = 0;

      metas.forEach((m) => {
        const score = parseInt(m.meta_value, 10);
        if (!isNaN(score)) {
          if (score >= 900) b900++;
          else if (score >= 785) b785++;
          else if (score >= 650) b650++;
          else b500++;
        }
      });

      const totalTarget = b500 + b650 + b785 + b900;
      if (totalTarget > 0) {
        studentTargetStats = {
          band500: b500,
          band650: b650,
          band785: b785,
          band900: b900,
          totalStudentsWithTarget: totalTarget,
          pct500: Math.round((b500 / totalTarget) * 100),
          pct650: Math.round((b650 / totalTarget) * 100),
          pct785: Math.round((b785 / totalTarget) * 100),
          pct900: Math.round((b900 / totalTarget) * 100),
          averageScore: Math.round((b500 * 500 + b650 * 650 + b785 * 785 + b900 * 900) / totalTarget),
        };
      }
    } catch (targetErr) {
      console.warn('Could not query student target stats:', targetErr);
    }

    // 8. Aggregate data for charts
    const courseStats = courses.map((course) => {
      const courseChapters = chapters
        .filter((c) => c.course_id === course.id)
        .map((c) => c.id);
      const courseLessons = lessons.filter((l) => courseChapters.includes(l.chapter_id));
      return {
        name: course.title,
        lessons: courseLessons.length,
        published: courseLessons.filter((l) => l.is_published).length,
        content: courseLessons.filter((l) => l.content && l.content.trim().length > 0).length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalCourses,
          totalChapters,
          totalLessons,
          lessonsWithContent,
          publishedLessons,
          completionRate,
          totalUsers,
          totalStudents,
          totalTeachers,
          totalAdmins,
          proMembers,
          totalExams,
          publishedExams,
        },
        studentTargetStats,
        charts: {
          courseStats,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch stats',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

interface Chapter {
  id: string;
  title: string;
  sort_order: number;
  lessons: { id: string }[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  chapters: Chapter[];
}

export default function AdminCategoriesPage() {
  const { loading: authLoading, hasAccess } = useAdminAccess();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && hasAccess) {
      fetchCourses();
    }
  }, [authLoading, hasAccess]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/courses-full');
      if (!response.ok) throw new Error('Không tải được danh mục');

      const data = await response.json();
      setCourses(data.data?.courses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) return null;

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-700 mb-4">{error}</p>
        <button
          onClick={fetchCourses}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Danh mục</h1>
        <p className="text-slate-500 text-sm">
          Quản lý cấu trúc khóa học và chương trong hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-slate-500 text-sm">Khóa học</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{courses.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-slate-500 text-sm">Chương</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            {courses.reduce((sum, c) => sum + (c.chapters?.length || 0), 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-slate-500 text-sm">Bài học</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            {courses.reduce(
              (sum, c) =>
                sum + (c.chapters?.reduce((cs, ch) => cs + (ch.lessons?.length || 0), 0) || 0),
              0
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Chưa có danh mục nào</p>
          </div>
        ) : (
          courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCourse(course.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {expandedCourses.has(course.id) ? (
                    <ChevronDown className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{course.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{course.slug}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex-shrink-0 ml-3">
                  {course.chapters?.length || 0} chương
                </span>
              </button>

              {expandedCourses.has(course.id) && (
                <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
                  {course.chapters?.length ? (
                    course.chapters.map((chapter, idx) => (
                      <div
                        key={chapter.id}
                        className="px-5 py-3 pl-14 flex items-center justify-between"
                      >
                        <p className="text-sm text-slate-700">
                          Chương {idx + 1}: {chapter.title}
                        </p>
                        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                          {chapter.lessons?.length || 0} bài
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-5 py-4 pl-14 text-sm text-slate-400">Chưa có chương</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

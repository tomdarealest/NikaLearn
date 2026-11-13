'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  Search,
  Loader,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

interface ExamItem {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  exam_type: 'practice' | 'graded';
  subject: string;
  duration_minutes: number;
  total_score: number;
  pass_score: number;
  show_explanation: 'none' | 'below' | 'popup';
  status: 'draft' | 'published' | 'archived';
  question_count: number;
  created_at: string;
  updated_at: string;
}

interface ExamStats {
  total: number;
  draft: number;
  published: number;
  practice: number;
  graded: number;
  questions: number;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function statusLabel(status: string) {
  if (status === 'published') return 'Đã xuất bản';
  if (status === 'archived') return 'Lưu trữ';
  return 'Nháp';
}

function statusClass(status: string) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'archived') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

export default function AdminExamsPage() {
  const { loading: authLoading, hasAccess } = useAdminAccess();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [stats, setStats] = useState<ExamStats>({
    total: 0,
    draft: 0,
    published: 0,
    practice: 0,
    graded: 0,
    questions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && hasAccess) fetchExams();
  }, [authLoading, hasAccess, statusFilter, typeFilter]);

  const fetchExams = async (search = searchQuery) => {
    try {
      setLoading(true);
      setError(null);
      setSchemaMissing(false);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('exam_type', typeFilter);

      const res = await fetch(`/api/admin/exams?${params.toString()}`);
      const data = await res.json();

      if (data.code === 'SCHEMA_MISSING') {
        setSchemaMissing(true);
        setError(data.message);
        setExams([]);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được đề thi');
      }

      setExams(data.data.exams || []);
      setStats(data.data.stats || stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exam: ExamItem) => {
    const ok = window.confirm(`Xóa đề thi "${exam.title}"?\nToàn bộ câu hỏi/đáp án sẽ bị xóa.`);
    if (!ok) return;
    try {
      setDeletingId(exam.id);
      const res = await fetch(`/api/admin/exams/${exam.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể xóa');
      await fetchExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa đề thi');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }
  if (!hasAccess) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Quản lý đề thi</h1>
          <p className="text-slate-500 text-sm">
            Tạo đề → thêm câu hỏi / đáp án / lời giải (theo luồng AZtest)
          </p>
        </div>
        <Link
          href="/admin/exams/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Tạo đề thi
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Tổng đề thi</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Đã xuất bản</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.published}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Nháp</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.draft}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Tổng câu hỏi</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.questions}</p>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl">
              <Clock className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchExams(searchQuery);
          }}
          className="relative w-full sm:w-64 md:w-72"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm đề thi..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="archived">Lưu trữ</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm"
        >
          <option value="">Tất cả hình thức</option>
          <option value="practice">Tự luyện</option>
          <option value="graded">Chấm điểm</option>
        </select>
        <button
          type="button"
          onClick={() => fetchExams()}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium shadow-sm sm:ml-auto"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-800 text-sm font-medium">{error}</p>
              {schemaMissing && (
                <div className="mt-2 text-xs text-amber-700 space-y-1">
                  <p>
                    1. Mở Supabase → SQL Editor
                  </p>
                  <p>
                    2. Chạy file <code className="bg-amber-100 px-1 rounded">database/exams-schema.sql</code>
                  </p>
                  <p>3. Bấm Làm mới lại trang này</p>
                </div>
              )}
            </div>
            <button onClick={() => fetchExams()} className="text-sm text-amber-700 font-medium">
              Thử lại
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Chưa có đề thi nào</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">
              Bắt đầu bằng cách tạo đề thi mới
            </p>
            {!schemaMissing && (
              <Link
                href="/admin/exams/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Tạo đề thi
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Đề thi</th>
                  <th className="px-5 py-3 font-medium">Hình thức</th>
                  <th className="px-5 py-3 font-medium">Thời gian</th>
                  <th className="px-5 py-3 font-medium">Câu hỏi</th>
                  <th className="px-5 py-3 font-medium">Hiển thị lời giải</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium">Cập nhật</th>
                  <th className="px-5 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 min-w-[220px]">
                      <p className="font-medium text-slate-800">{exam.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {exam.code ? `${exam.code} · ` : ''}
                        {exam.subject}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">
                        {exam.exam_type === 'practice' ? 'Tự luyện' : 'Chấm điểm'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{exam.duration_minutes} phút</td>
                    <td className="px-5 py-3.5 text-slate-600">{exam.question_count}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {exam.show_explanation === 'popup'
                        ? 'Popup'
                        : exam.show_explanation === 'below'
                          ? 'Dưới câu hỏi'
                          : 'Ẩn'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${statusClass(exam.status)}`}
                      >
                        {statusLabel(exam.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(exam.updated_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Chỉnh sửa / Quản lý câu hỏi"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(exam)}
                          disabled={deletingId === exam.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                          title="Xóa"
                        >
                          {deletingId === exam.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Luồng tạo đề (theo AZtest)</p>
        <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
          <li>Tạo đề thi — nhập thông tin hình thức Tự luyện / Chấm điểm</li>
          <li>Quản lý câu hỏi — thêm câu hỏi, đáp án, lời giải</li>
          <li>Chọn kiểu hiển thị lời giải: dưới câu hỏi hoặc popup</li>
        </ol>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Plus,
  Search,
  Loader,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Layers,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

interface ReviewTopic {
  id: string;
  title: string;
  description: string | null;
  toeic_level: string;
  target_word_count: number;
  status: string;
  card_count: number;
  ai_model: string | null;
  created_at: string;
}

interface ReviewStats {
  total: number;
  draft: number;
  published: number;
  cards: number;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner (500–650)',
  intermediate: 'Intermediate (650–800)',
  advanced: 'Advanced (800+)',
};

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

export default function AdminReviewPage() {
  const { loading: authLoading, hasAccess } = useAdminAccess();
  const [topics, setTopics] = useState<ReviewTopic[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, draft: 0, published: 0, cards: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    toeic_level: 'intermediate',
    target_word_count: 10,
  });

  const fetchTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/review-topics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được chủ đề ôn tập');
      }
      setTopics(data.data.topics || []);
      setStats(data.data.stats || { total: 0, draft: 0, published: 0, cards: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && hasAccess) fetchTopics();
  }, [authLoading, hasAccess, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      setCreating(true);
      const res = await fetch('/api/admin/review-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tạo được chủ đề');
      }
      setShowCreate(false);
      setForm({ title: '', description: '', toeic_level: 'intermediate', target_word_count: 10 });
      fetchTopics();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi tạo chủ đề');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xóa chủ đề "${title}" và toàn bộ flashcard?`)) return;
    try {
      const res = await fetch(`/api/admin/review-topics/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      fetchTopics();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 text-center text-slate-500">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold mb-2">
            <Brain className="w-3.5 h-3.5" />
            AI Flashcard TOEIC
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý ôn tập</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý chủ đề từ vựng — AI sinh bộ flashcard ôn tập
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm chủ đề
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Tổng chủ đề', value: stats.total, icon: Layers, color: 'text-blue-600 bg-blue-50' },
          { label: 'Nháp', value: stats.draft, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Đã xuất bản', value: stats.published, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Tổng thẻ', value: stats.cards, icon: Sparkles, color: 'text-violet-600 bg-violet-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTopics();
          }}
          className="relative flex-1 max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm chủ đề (Travel, Business...)"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Chủ đề</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Trình độ</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Thẻ</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Trạng thái</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Cập nhật</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topics.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  Chưa có chủ đề. Bấm &quot;Thêm chủ đề&quot; để bắt đầu.
                </td>
              </tr>
            ) : (
              topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/review/${topic.id}`}
                      className="font-medium text-slate-900 hover:text-violet-600"
                    >
                      {topic.title}
                    </Link>
                    {topic.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{topic.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {LEVEL_LABEL[topic.toeic_level] || topic.toeic_level}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-violet-700 font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      {topic.card_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass(topic.status)}`}>
                      {statusLabel(topic.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                    {formatDate(topic.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/review/${topic.id}`}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                        title="Chi tiết & Sinh AI"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(topic.id, topic.title)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Thêm chủ đề ôn tập</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên chủ đề *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Travel, Business, Airport"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trình độ TOEIC</label>
                  <select
                    value={form.toeic_level}
                    onChange={(e) => setForm({ ...form, toeic_level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số từ (AI)</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={form.target_word_count}
                    onChange={(e) => setForm({ ...form, target_word_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo chủ đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

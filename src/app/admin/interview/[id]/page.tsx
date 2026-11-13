'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';
import { CATEGORY_TABS, LEVEL_FILTERS, TECHNOLOGIES, type InterviewCategory } from '@/lib/interview-data';

interface InterviewTopic {
  id: string;
  title: string;
  technology_id: string;
  category: InterviewCategory;
  description: string | null;
  target_question_count: number;
  status: string;
  ai_model: string | null;
}

interface InterviewQuestion {
  id: string;
  level: string;
  question: string;
  answer: string;
  sort_order: number;
}

const CATEGORY_LABEL = Object.fromEntries(CATEGORY_TABS.map((c) => [c.id, c.label]));
const LEVEL_LABEL = Object.fromEntries(LEVEL_FILTERS.map((l) => [l.id, l.label]));

function levelBadgeClass(level: string) {
  const found = LEVEL_FILTERS.find((l) => l.id === level);
  if (!found) return 'bg-slate-100 text-slate-600';
  return `${found.textColor} bg-white border ${found.borderColor}`;
}

export default function AdminInterviewDetailPage() {
  const params = useParams();
  const topicId = params.id as string;
  const { loading: authLoading, hasAccess } = useAdminAccess();

  const [topic, setTopic] = useState<InterviewTopic | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const fetchTopic = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/interview-topics/${topicId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được chủ đề');
      }
      setTopic(data.data.topic);
      setQuestions(data.data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    if (!authLoading && hasAccess && topicId) fetchTopic();
  }, [authLoading, hasAccess, topicId, fetchTopic]);

  const handleGenerate = async () => {
    if (!topic) return;
    try {
      setGenerating(true);
      setError(null);
      const res = await fetch(`/api/admin/interview-topics/${topicId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_count: topic.target_question_count,
          replace_existing: replaceExisting,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.message || 'Sinh AI thất bại');
      }
      await fetchTopic();
      alert(data.message || `Đã sinh ${data.data.generated} câu hỏi`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi sinh AI');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!topic) return;
    const next = topic.status === 'published' ? 'draft' : 'published';
    const res = await fetch(`/api/admin/interview-topics/${topicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (data.success) fetchTopic();
  };

  const tech = topic ? TECHNOLOGIES.find((t) => t.id === topic.technology_id) : null;
  const previewQuestion = questions[previewIndex];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!hasAccess || !topic) {
    return (
      <div className="p-8 text-center text-slate-500">
        {error || 'Không tìm thấy chủ đề'}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <Link
        href="/admin/interview"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Quản lý phỏng vấn
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{tech?.icon}</span>
            <h1 className="text-2xl font-bold text-slate-900">{topic.title}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {CATEGORY_LABEL[topic.category]} · Mục tiêu {topic.target_question_count} câu
            {topic.ai_model && ` · Model: ${topic.ai_model}`}
          </p>
          {topic.description && <p className="text-sm text-slate-600 mt-2">{topic.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 text-xs text-slate-600 bg-slate-50 rounded-lg border">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
            />
            Thay thế câu cũ
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Đang sinh AI...' : 'Sinh AI'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border ${
              topic.status === 'published'
                ? 'border-amber-200 text-amber-700 bg-amber-50'
                : 'border-emerald-200 text-emerald-700 bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {topic.status === 'published' ? 'Chuyển nháp' : 'Xuất bản'}
          </button>
        </div>
      </div>

      {generating && topic && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
          <Loader className="w-4 h-4 animate-spin shrink-0" />
          AI đang sinh {topic.target_question_count} câu theo từng lô (5 câu/lần)
          {topic.target_question_count > 20 ? ' — có thể mất vài phút' : ''}, vui lòng đợi...
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Preview Q&amp;A</h2>
          {questions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
              Chưa có câu hỏi. Bấm <strong>Sinh AI</strong> để tạo bộ phỏng vấn.
            </div>
          ) : previewQuestion ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${levelBadgeClass(previewQuestion.level)}`}>
                    {LEVEL_LABEL[previewQuestion.level] || previewQuestion.level}
                  </span>
                  <span className="text-xs text-slate-400">#{previewIndex + 1}</span>
                </div>
                <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Câu hỏi</p>
                <p className="text-lg text-slate-800 leading-relaxed">{previewQuestion.question}</p>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Đáp án mẫu</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{previewQuestion.answer || '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex((i) => i - 1)}
                  className="text-sm text-slate-500 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-400">
                  {previewIndex + 1} / {questions.length}
                </span>
                <button
                  type="button"
                  disabled={previewIndex >= questions.length - 1}
                  onClick={() => setPreviewIndex((i) => i + 1)}
                  className="text-sm text-slate-500 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Danh sách câu hỏi ({questions.length})
            </h2>
            <button
              type="button"
              onClick={fetchTopic}
              className="text-xs text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isExpanded = expandedId === q.id;
              return (
                <div
                  key={q.id}
                  className={`rounded-xl border transition-colors ${
                    idx === previewIndex
                      ? 'border-indigo-300 bg-indigo-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left p-4"
                    onClick={() => {
                      setPreviewIndex(idx);
                      setExpandedId(isExpanded ? null : q.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${levelBadgeClass(q.level)}`}>
                            {LEVEL_LABEL[q.level]}
                          </span>
                          <span className="text-xs text-slate-400">#{idx + 1}</span>
                        </div>
                        <p className="font-medium text-slate-900 line-clamp-2">{q.question}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                      <p className="text-xs font-semibold text-emerald-600 mb-1">Đáp án</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{q.answer || '—'}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

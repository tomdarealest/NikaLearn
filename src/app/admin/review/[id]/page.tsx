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
  Trash2,
  RotateCcw,
  Volume2,
  Database,
  Check,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

interface ReviewTopic {
  id: string;
  title: string;
  description: string | null;
  toeic_level: string;
  target_word_count: number;
  status: string;
  ai_model: string | null;
}

interface Flashcard {
  id: string;
  topic_id?: string;
  word: string;
  meaning_vi: string;
  ipa: string;
  example_en: string;
  fill_blank: string;
  fill_answer: string;
  image_prompt: string;
  sort_order: number;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner (500–650)',
  intermediate: 'Intermediate (650–800)',
  advanced: 'Advanced (800+)',
};

export default function AdminReviewDetailPage() {
  const params = useParams();
  const topicId = params.id as string;
  const { loading: authLoading, hasAccess } = useAdminAccess();

  const [topic, setTopic] = useState<ReviewTopic | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const fetchTopic = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/review-topics/${topicId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tải được chủ đề');
      }
      setTopic(data.data.topic);
      setCards(data.data.cards || []);
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
      setSuccessMsg(null);
      const res = await fetch(`/api/admin/review-topics/${topicId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_count: topic.target_word_count,
          replace_existing: replaceExisting,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.message || 'Sinh AI thất bại');
      }
      await fetchTopic();
      setSuccessMsg(data.message || `Đã sinh thành công ${data.data.generated} thẻ từ kho Database!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi sinh AI');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!topic) return;
    const next = topic.status === 'published' ? 'draft' : 'published';
    const res = await fetch(`/api/admin/review-topics/${topicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (data.success) fetchTopic();
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const previewCard = cards[previewIndex];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-[#1A2616]" />
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
        href="/admin/review"
        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Quản lý ôn tập
      </Link>

      {/* Header Topic */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6 pb-6 border-b-2 border-[#121212]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-[#121212] tracking-tight">{topic.title}</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 border border-emerald-300 rounded-md text-[11px] font-bold text-emerald-800">
              <Database className="w-3 h-3" /> Kho Supabase: 27,986 từ
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1.5">
            {LEVEL_LABEL[topic.toeic_level]} · Mục tiêu <span className="font-bold text-black">{topic.target_word_count} từ</span>
            {topic.ai_model && ` · AI Model: ${topic.ai_model}`}
          </p>
          {topic.description && (
            <p className="text-sm text-slate-700 mt-2 bg-[#F6F7F2] p-2.5 rounded-lg border border-[#121212]/20 font-medium max-w-2xl">
              💡 {topic.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white rounded-lg border-2 border-[#121212] cursor-pointer shadow-[2px_2px_0px_#121212]">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="accent-[#1A2616]"
            />
            Thay thế thẻ cũ
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFD23F] hover:bg-[#ffe066] text-[#121212] text-sm font-black rounded-lg border-2 border-[#121212] shadow-[3px_3px_0px_#121212] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#121212] transition-all disabled:opacity-50"
            title="Lấy từ vựng từ bảng dictionary của Supabase và AI tinh chỉnh thành Flashcard"
          >
            {generating ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-[#121212]" />
                <span>Đang trích xuất DB & Sinh AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#121212]" />
                <span>Sinh AI từ Database</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-black rounded-lg border-2 border-[#121212] shadow-[3px_3px_0px_#121212] transition-all ${
              topic.status === 'published'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-200 text-[#121212]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {topic.status === 'published' ? 'Chuyển nháp' : 'Xuất bản'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2.5 p-4 bg-emerald-50 border-2 border-emerald-700 rounded-xl text-sm font-bold text-emerald-900 shadow-[3px_3px_0px_rgba(4,120,87,0.3)]">
          <Check className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border-2 border-red-700 rounded-xl text-sm font-bold text-red-900 shadow-[3px_3px_0px_rgba(185,28,28,0.3)]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Grid: Flashcard preview & Card list */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Flashcard preview */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
            <span>Preview Flashcard</span>
            <span className="text-xs font-normal text-slate-500 lowercase">(bấm vào thẻ để lật)</span>
          </h2>

          {cards.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-500 bg-white text-sm">
              <p className="font-medium">Chưa có thẻ flashcard nào.</p>
              <p className="text-xs text-slate-400 mt-1">
                Bấm nút <strong className="text-black">"Sinh AI từ Database"</strong> để AI quét kho từ điển Supabase và tạo bộ ôn tập.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="relative h-72 cursor-pointer select-none"
                style={{ perspective: '1000px' }}
                onClick={() => setFlipped(!flipped)}
              >
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-[#121212] bg-[#FAF8F5] shadow-[5px_5px_0px_#121212] p-6 transition-transform duration-500 flex flex-col justify-between"
                  style={{
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-[#FFD23F] border border-[#121212] rounded-md text-[11px] font-black uppercase text-[#121212] mb-3">
                      Mặt trước — Điền từ ngữ cảnh
                    </span>
                    <p className="text-lg font-bold text-slate-900 leading-relaxed mt-2">
                      {previewCard.fill_blank || previewCard.example_en}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(previewCard.word);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#121212] rounded-lg text-xs font-bold text-[#1A2616] hover:bg-slate-100"
                    >
                      <Volume2 className="w-4 h-4" />
                      Phát âm
                    </button>
                    <p className="text-xs font-semibold text-slate-400">Click để lật xem đáp án ↺</p>
                  </div>
                </div>

                {flipped && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-[#121212] bg-[#E8EFE6] shadow-[5px_5px_0px_#121212] p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-block px-2.5 py-1 bg-[#1A2616] text-[#FAF8F5] rounded-md text-[11px] font-black uppercase">
                          Mặt sau — Giải nghĩa
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-300">
                          {previewCard.ipa}
                        </span>
                      </div>
                      <p className="text-3xl font-black text-[#121212] tracking-tight">{previewCard.word}</p>
                      <p className="text-base font-bold text-emerald-800 mt-1.5">{previewCard.meaning_vi}</p>
                      <p className="text-xs font-medium text-slate-700 mt-3 italic bg-white/80 p-2.5 rounded-lg border border-slate-300">
                        "{previewCard.example_en}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-300 text-xs text-slate-500">
                      <span>Đáp án: <strong className="text-black">{previewCard.fill_answer}</strong></span>
                      <span className="italic truncate max-w-[200px]" title={previewCard.image_prompt}>
                        🎨 {previewCard.image_prompt}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={() => {
                    setPreviewIndex((i) => i - 1);
                    setFlipped(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-black disabled:opacity-30 rounded-lg hover:bg-slate-100"
                >
                  ← Thẻ trước
                </button>
                <span className="text-xs font-bold text-slate-700">
                  {previewIndex + 1} / {cards.length}
                </span>
                <button
                  type="button"
                  disabled={previewIndex >= cards.length - 1}
                  onClick={() => {
                    setPreviewIndex((i) => i + 1);
                    setFlipped(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-black disabled:opacity-30 rounded-lg hover:bg-slate-100"
                >
                  Thẻ tiếp →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Danh sách từ trong bộ ({cards.length})
            </h2>
            <button
              type="button"
              onClick={fetchTopic}
              className="text-xs font-bold text-slate-600 hover:text-black inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              Làm mới
            </button>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  idx === previewIndex
                    ? 'border-[#121212] bg-[#FAF8F5] shadow-[3px_3px_0px_#121212]'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
                onClick={() => {
                  setPreviewIndex(idx);
                  setFlipped(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="font-black text-slate-900 text-base">{card.word}</p>
                      <span className="text-xs font-mono text-slate-500">{card.ipa}</span>
                    </div>
                    <p className="text-sm font-medium text-emerald-800 mt-0.5">{card.meaning_vi}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-1 italic">
                  {card.fill_blank || card.example_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

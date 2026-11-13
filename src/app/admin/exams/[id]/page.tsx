'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  FileQuestion,
  Volume2,
  Image as ImageIcon,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

interface Answer {
  id?: string;
  content: string;
  is_correct: boolean;
  sort_order?: number;
}

interface Question {
  id: string;
  content: string;
  explanation: string;
  points: number;
  sort_order: number;
  audio_url?: string | null;
  image_url?: string | null;
  transcript?: string | null;
  part_number?: number | null;
  question_number?: number | null;
  answers: Answer[];
}

interface ExamDetail {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  exam_type: 'practice' | 'graded';
  subject: string;
  duration_minutes: number;
  total_score: number;
  pass_score: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_explanation: 'none' | 'below' | 'popup';
  question_input_method: string;
  status: 'draft' | 'published' | 'archived';
}

const emptyAnswer = (): Answer => ({ content: '', is_correct: false });

export default function ExamDetailPage() {
  const params = useParams();
  const examId = params.id as string;
  const { loading: authLoading, hasAccess } = useAdminAccess();

  const [tab, setTab] = useState<'settings' | 'questions'>('questions');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qForm, setQForm] = useState({
    content: '',
    explanation: '',
    points: 1,
    answers: [emptyAnswer(), emptyAnswer(), emptyAnswer(), emptyAnswer()] as Answer[],
  });
  const [qError, setQError] = useState<string | null>(null);
  const [qSaving, setQSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && hasAccess && examId) loadExam();
  }, [authLoading, hasAccess, examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/exams/${examId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không tải được đề thi');
      setExam(data.data.exam);
      setQuestions(data.data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exam),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể lưu');
      setExam(data.data.exam);
      setSuccess('Đã cập nhật thiết lập đề thi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQForm({
      content: '',
      explanation: '',
      points: 1,
      answers: [emptyAnswer(), emptyAnswer(), emptyAnswer(), emptyAnswer()],
    });
    setQError(null);
    setShowQuestionModal(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    const answers =
      q.answers?.length >= 2
        ? q.answers.map((a) => ({ content: a.content, is_correct: a.is_correct }))
        : [emptyAnswer(), emptyAnswer()];
    setQForm({
      content: q.content,
      explanation: q.explanation || '',
      points: q.points || 1,
      answers,
    });
    setQError(null);
    setShowQuestionModal(true);
  };

  const setCorrectAnswer = (index: number) => {
    setQForm((f) => ({
      ...f,
      answers: f.answers.map((a, i) => ({ ...a, is_correct: i === index })),
    }));
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQError(null);

    if (!qForm.content.trim()) {
      setQError('Nhập nội dung câu hỏi');
      return;
    }
    const validAnswers = qForm.answers.filter((a) => a.content.trim());
    if (validAnswers.length < 2) {
      setQError('Cần ít nhất 2 đáp án');
      return;
    }
    if (!validAnswers.some((a) => a.is_correct)) {
      setQError('Chọn 1 đáp án đúng');
      return;
    }

    try {
      setQSaving(true);
      const payload = {
        content: qForm.content.trim(),
        explanation: qForm.explanation,
        points: qForm.points,
        answers: validAnswers,
      };

      const url = editingQuestion
        ? `/api/admin/exams/${examId}/questions/${editingQuestion.id}`
        : `/api/admin/exams/${examId}/questions`;
      const method = editingQuestion ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể lưu câu hỏi');

      setShowQuestionModal(false);
      await loadExam();
    } catch (err) {
      setQError(err instanceof Error ? err.message : 'Không thể lưu câu hỏi');
    } finally {
      setQSaving(false);
    }
  };

  const deleteQuestion = async (q: Question) => {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    try {
      const res = await fetch(`/api/admin/exams/${examId}/questions/${q.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể xóa');
      await loadExam();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa câu hỏi');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }
  if (!hasAccess) return null;

  if (!exam) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 mb-4">{error || 'Không tìm thấy đề thi'}</p>
        <Link href="/admin/exams" className="text-blue-600 text-sm font-medium">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/exams"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{exam.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {exam.code ? `${exam.code} · ` : ''}
              {exam.subject} ·{' '}
              {exam.exam_type === 'practice' ? 'Tự luyện' : 'Chấm điểm'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddQuestion}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Thêm câu hỏi
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('questions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'questions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Quản lý câu hỏi ({questions.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Thiết lập đề thi
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
          {success}
        </div>
      )}

      {tab === 'settings' && (
        <form
          onSubmit={saveSettings}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Tên đề thi</label>
              <input
                className={inputClass}
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Mã đề</label>
              <input
                className={inputClass}
                value={exam.code || ''}
                onChange={(e) => setExam({ ...exam, code: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Phân môn</label>
              <input
                className={inputClass}
                value={exam.subject}
                onChange={(e) => setExam({ ...exam, subject: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Hình thức</label>
              <select
                className={inputClass}
                value={exam.exam_type}
                onChange={(e) =>
                  setExam({ ...exam, exam_type: e.target.value as 'practice' | 'graded' })
                }
              >
                <option value="practice">Tự luyện</option>
                <option value="graded">Chấm điểm</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Kiểu hiển thị lời giải</label>
              <select
                className={inputClass}
                value={exam.show_explanation}
                onChange={(e) =>
                  setExam({
                    ...exam,
                    show_explanation: e.target.value as 'none' | 'below' | 'popup',
                  })
                }
              >
                <option value="below">Hiển thị bên dưới câu hỏi</option>
                <option value="popup">Hiển thị popup</option>
                <option value="none">Không hiển thị</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Thời gian (phút)</label>
              <input
                type="number"
                className={inputClass}
                value={exam.duration_minutes}
                onChange={(e) =>
                  setExam({ ...exam, duration_minutes: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Trạng thái</label>
              <select
                className={inputClass}
                value={exam.status}
                onChange={(e) =>
                  setExam({
                    ...exam,
                    status: e.target.value as 'draft' | 'published' | 'archived',
                  })
                }
              >
                <option value="draft">Nháp</option>
                <option value="published">Xuất bản</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Mô tả</label>
              <textarea
                className={`${inputClass} min-h-[80px]`}
                value={exam.description || ''}
                onChange={(e) => setExam({ ...exam, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={exam.shuffle_questions}
                onChange={(e) => setExam({ ...exam, shuffle_questions: e.target.checked })}
                className="accent-blue-600"
              />
              Xáo trộn câu hỏi
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={exam.shuffle_answers}
                onChange={(e) => setExam({ ...exam, shuffle_answers: e.target.checked })}
                className="accent-blue-600"
              />
              Xáo trộn đáp án
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu thiết lập
          </button>
        </form>
      )}

      {tab === 'questions' && (
        <div className="space-y-3">
          {questions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-14">
              <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Chưa có câu hỏi</p>
              <p className="text-slate-400 text-sm mt-1 mb-4">
                Thêm câu hỏi → đáp án → lời giải
              </p>
              <button
                type="button"
                onClick={openAddQuestion}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Thêm câu hỏi
              </button>
            </div>
          ) : (
            questions.map((q, index) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap"><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{q.part_number ? `Part ${q.part_number} · ` : ''}Câu {q.question_number || index + 1}</span><span className="text-slate-400 text-xs">· {q.points} điểm</span></div>



                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{q.content}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditQuestion(q)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(q)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* File Audio MP3 */}
                {q.audio_url && (
                  <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span>File Audio MP3:</span>
                      <span className="text-slate-400 font-normal truncate text-[11px] max-w-md">{q.audio_url}</span>
                    </div>
                    <audio controls src={q.audio_url} className="w-full h-8" preload="none" />
                  </div>
                )}

                {/* Hình ảnh mô tả */}
                {q.image_url && (
                  <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 inline-block">
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Ảnh mô tả (Picture)</span>
                    </div>
                    <img
                      src={q.image_url}
                      alt={`Câu ${index + 1}`}
                      className="max-h-56 rounded-lg border border-slate-200 object-contain bg-white shadow-xs"
                    />
                  </div>
                )}

                {/* Transcript */}
                {q.transcript && (
                  <div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Transcript đoạn nghe tiếng Anh:</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{q.transcript}</p>
                  </div>
                )}

                <div className="space-y-1.5 ml-1">
                  {q.answers?.map((a, ai) => (
                    <div
                      key={a.id || ai}
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                        a.is_correct
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      {a.is_correct ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                      )}
                      <span>
                        {String.fromCharCode(65 + ai)}. {a.content.replace(/^[A-D][.:)\s-]\s*/i, '').trim() || a.content}
                      </span>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Lời giải</p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showQuestionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => !qSaving && setShowQuestionModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}
                </h2>
                <p className="text-xs text-slate-400">Câu hỏi · Đáp án · Lời giải</p>
              </div>
              <button
                type="button"
                onClick={() => !qSaving && setShowQuestionModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveQuestion} className="p-5 space-y-4">
              {qError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {qError}
                </div>
              )}

              <div>
                <label className={labelClass}>Nội dung câu hỏi *</label>
                <textarea
                  className={`${inputClass} min-h-[90px]`}
                  value={qForm.content}
                  onChange={(e) => setQForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Nhập nội dung câu hỏi..."
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">Đáp án *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setQForm((f) => ({
                        ...f,
                        answers: [...f.answers, emptyAnswer()],
                      }))
                    }
                    className="text-xs text-blue-600 font-medium"
                  >
                    + Thêm đáp án
                  </button>
                </div>
                <div className="space-y-2">
                  {qForm.answers.map((a, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(index)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border transition ${
                          a.is_correct
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                        }`}
                        title="Đánh dấu đáp án đúng"
                      >
                        {String.fromCharCode(65 + index)}
                      </button>
                      <input
                        className={inputClass}
                        value={a.content}
                        onChange={(e) => {
                          const value = e.target.value;
                          setQForm((f) => ({
                            ...f,
                            answers: f.answers.map((ans, i) =>
                              i === index ? { ...ans, content: value } : ans
                            ),
                          }));
                        }}
                        placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                      />
                      {qForm.answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setQForm((f) => ({
                              ...f,
                              answers: f.answers.filter((_, i) => i !== index),
                            }))
                          }
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click chữ cái (A/B/C...) để chọn đáp án đúng
                </p>
              </div>

              <div>
                <label className={labelClass}>Lời giải</label>
                <textarea
                  className={`${inputClass} min-h-[70px]`}
                  value={qForm.explanation}
                  onChange={(e) => setQForm((f) => ({ ...f, explanation: e.target.value }))}
                  placeholder="Giải thích đáp án / kiến thức liên quan..."
                />
              </div>

              <div>
                <label className={labelClass}>Điểm</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={`${inputClass} w-28`}
                  value={qForm.points}
                  onChange={(e) =>
                    setQForm((f) => ({ ...f, points: Number(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  disabled={qSaving}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={qSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {qSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Upload,
  Music,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  FileJson,
  AlertCircle,
  X,
  Layers,
  FolderPlus,
  Check,
  Database,
  FolderDown,
  Loader,
  Calendar,
  FileCheck2,
  ListFilter,
} from 'lucide-react';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';

// Tailwind styling presets
const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-white/10 transition';
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5';

// Part definition according to TOEIC ETS standards
export interface PartMeta {
  partNumber: number;
  name: string;
  targetCount: number;
  type: 'single' | 'group';
  desc: string;
}

export const TOEIC_PARTS_META: PartMeta[] = [
  { partNumber: 1, name: 'Part 1: Tranh tả người & vật', targetCount: 6, type: 'single', desc: 'Mô tả hình ảnh (6 câu đơn)' },
  { partNumber: 2, name: 'Part 2: Hỏi & Đáp', targetCount: 25, type: 'single', desc: 'Hỏi - Đáp (3 phương án A-B-C)' },
  { partNumber: 3, name: 'Part 3: Đoạn hội thoại', targetCount: 39, type: 'group', desc: '13 đoạn hội thoại, mỗi đoạn 3 câu' },
  { partNumber: 4, name: 'Part 4: Bài nói chuyện', targetCount: 30, type: 'group', desc: '10 bài nói ngắn, mỗi bài 3 câu' },
  { partNumber: 5, name: 'Part 5: Điền câu ngữ pháp', targetCount: 30, type: 'single', desc: 'Hoàn thành câu đơn lẻ (4 phương án)' },
  { partNumber: 6, name: 'Part 6: Điền đoạn văn', targetCount: 16, type: 'group', desc: '4 đoạn văn, mỗi đoạn 4 câu hỏi' },
  { partNumber: 7, name: 'Part 7: Đọc hiểu văn bản', targetCount: 54, type: 'group', desc: 'Đoạn đơn & đoạn kép, 54 câu hỏi' },
];

export interface SingleQuestion {
  id: string;
  partNumber: number;
  questionNumber: number;
  difficulty: 'easy' | 'medium' | 'hard';
  audioUrl?: string;
  imageUrl?: string;
  transcript?: string;
  questionText: string;
  options: { label: string; text: string }[];
  correctOption: string;
  translation?: string;
  explanation?: string;
}

export interface SubQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: { label: string; text: string }[];
  correctOption: string;
  explanation?: string;
  translation?: string;
}

export interface GroupPassage {
  id: string;
  partNumber: number;
  groupTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  audioUrl?: string;
  transcript?: string;
  passageText?: string;
  passageImageUrl?: string;
  questions: SubQuestion[];
}

export interface TestDbItem {
  id: string;
  title: string;
  total_questions: number;
  created_at?: string;
  code?: string;
}

// Fallback Starter Question Banks in case database table is empty
const DEFAULT_SAMPLE_BANKS: TestDbItem[] = [
  {
    id: 'bank-ets-2024-01',
    title: 'ETS TOEIC Regular Full Test 01 (Chuẩn 200 câu)',
    total_questions: 200,
    created_at: '2026-10-20T08:00:00Z',
    code: 'ETS-2024-01',
  },
  {
    id: 'bank-ets-2024-02',
    title: 'ETS TOEIC Regular Full Test 02 (Listening & Reading)',
    total_questions: 200,
    created_at: '2026-10-24T09:30:00Z',
    code: 'ETS-2024-02',
  },
  {
    id: 'bank-economy-rc-01',
    title: 'Economy TOEIC RC Vol 1 Test 1 (Part 5, 6, 7)',
    total_questions: 100,
    created_at: '2026-10-26T14:15:00Z',
    code: 'ECON-RC-01',
  },
];

export default function CreateToeicTestPage() {
  const router = useRouter();
  const toast = useToast();
  const { loading: authLoading, hasAccess } = useAdminAccess();

  // Current Step (1 or 2)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // STEP 1 Form State
  const [examForm, setExamForm] = useState({
    title: '',
    code: '',
    subject: 'TOEIC',
    exam_type: 'practice' as 'practice' | 'graded',
    question_input_method: 'manual' as 'manual' | 'bank' | 'import',
    duration_minutes: 120,
    total_score: 990,
    pass_score: 450,
    show_explanation: 'below' as 'none' | 'below' | 'popup',
    status: 'draft' as 'draft' | 'published' | 'archived',
    description: '',
    shuffle_questions: false,
    shuffle_answers: false,
  });

  const [step1Error, setStep1Error] = useState<string | null>(null);

  // STEP 2 Form State
  const [activePart, setActivePart] = useState<number>(1);
  const [singleQuestions, setSingleQuestions] = useState<SingleQuestion[]>([]);
  const [groupPassages, setGroupPassages] = useState<GroupPassage[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal Import JSON
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Modal: THÊM TỪ DATA (SUPABASE)
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [dataModalMode, setDataModalMode] = useState<'full_test' | 'part_only'>('full_test');
  const [availableTests, setAvailableTests] = useState<TestDbItem[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [availablePartQuestions, setAvailablePartQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('toeic_exam_creator_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.examForm) setExamForm(parsed.examForm);
        if (parsed.singleQuestions) setSingleQuestions(parsed.singleQuestions);
        if (parsed.groupPassages) setGroupPassages(parsed.groupPassages);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      }
    } catch {}
  }, []);

  // Save to localStorage automatically on state change
  useEffect(() => {
    try {
      localStorage.setItem(
        'toeic_exam_creator_draft',
        JSON.stringify({
          currentStep,
          examForm,
          singleQuestions,
          groupPassages,
        })
      );
    } catch {}
  }, [currentStep, examForm, singleQuestions, groupPassages]);

  // Total questions count calculated across all parts
  const countPartQuestions = (partNum: number) => {
    const meta = TOEIC_PARTS_META.find((p) => p.partNumber === partNum);
    if (!meta) return 0;
    if (meta.type === 'single') {
      return singleQuestions.filter((q) => q.partNumber === partNum).length;
    } else {
      return groupPassages
        .filter((g) => g.partNumber === partNum)
        .reduce((sum, g) => sum + g.questions.length, 0);
    }
  };

  const totalQuestionsAdded = TOEIC_PARTS_META.reduce(
    (sum, p) => sum + countPartQuestions(p.partNumber),
    0
  );

  // Handle Step 1 Submit & Next
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);
    if (!examForm.title.trim()) {
      setStep1Error('Vui lòng nhập tên đề thi');
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper: Create single question
  const handleAddSingleQuestion = (partNum: number) => {
    const currentCount = singleQuestions.filter((q) => q.partNumber === partNum).length;
    const isPart2 = partNum === 2;

    const newQ: SingleQuestion = {
      id: `single-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      partNumber: partNum,
      questionNumber: currentCount + 1,
      difficulty: 'medium',
      audioUrl: '',
      imageUrl: '',
      transcript: '',
      questionText: partNum === 5 ? 'Customer satisfaction is our top _____ for the upcoming fiscal quarter.' : '',
      options: isPart2
        ? [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
          ]
        : [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' },
          ],
      correctOption: 'A',
      translation: '',
      explanation: '',
    };
    setSingleQuestions((prev) => [...prev, newQ]);
  };

  const handleUpdateSingleQuestion = (id: string, updates: Partial<SingleQuestion>) => {
    setSingleQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const handleDeleteSingleQuestion = (id: string) => {
    setSingleQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Helper: Create group passage (Parts 3, 4, 6, 7)
  const handleAddGroupPassage = (partNum: number) => {
    const existingGroups = groupPassages.filter((g) => g.partNumber === partNum);
    const startQNum =
      existingGroups.reduce((acc, g) => acc + g.questions.length, 0) + 1;

    const randSuffix = Math.random().toString(36).slice(2, 6);
    const initialSubQuestions: SubQuestion[] = [
      {
        id: `sub-${Date.now()}-1-${randSuffix}`,
        questionNumber: startQNum,
        questionText: 'What is the main topic of the conversation?',
        options: [
          { label: 'A', text: 'Rescheduling a meeting' },
          { label: 'B', text: 'Submitting a budget proposal' },
          { label: 'C', text: 'Hiring a new manager' },
          { label: 'D', text: 'Ordering office supplies' },
        ],
        correctOption: 'A',
        explanation: 'Người nói đề cập đến việc dời lịch buổi họp sang thứ 6.',
        translation: '',
      },
      {
        id: `sub-${Date.now()}-2-${randSuffix}`,
        questionNumber: startQNum + 1,
        questionText: 'What problem does the woman mention?',
        options: [
          { label: 'A', text: 'A flight delay' },
          { label: 'B', text: 'A broken printer' },
          { label: 'C', text: 'A missing document' },
          { label: 'D', text: 'A software error' },
        ],
        correctOption: 'B',
        explanation: 'Người phụ nữ nói máy in đang gặp sự cố kỹ thuật.',
        translation: '',
      },
      {
        id: `sub-${Date.now()}-3-${randSuffix}`,
        questionNumber: startQNum + 2,
        questionText: 'What will the man probably do next?',
        options: [
          { label: 'A', text: 'Call IT support' },
          { label: 'B', text: 'Leave for lunch' },
          { label: 'C', text: 'Send an email' },
          { label: 'D', text: 'Visit the client' },
        ],
        correctOption: 'A',
        explanation: 'Người đàn ông sẽ gọi ngay cho bộ phận IT.',
        translation: '',
      },
    ];

    const newGroup: GroupPassage = {
      id: `group-${Date.now()}-${randSuffix}`,
      partNumber: partNum,
      groupTitle: `Đoạn văn ${existingGroups.length + 1} (Câu ${startQNum} - ${startQNum + 2})`,
      difficulty: 'medium',
      audioUrl: '',
      transcript: '',
      passageText: partNum >= 6 ? 'Dear Valued Customers,\nWe are pleased to announce...' : '',
      passageImageUrl: '',
      questions: partNum >= 6 ? initialSubQuestions.slice(0, 2) : initialSubQuestions,
    };

    setGroupPassages((prev) => [...prev, newGroup]);
  };

  const handleUpdateGroup = (id: string, updates: Partial<GroupPassage>) => {
    setGroupPassages((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  const handleDeleteGroup = (id: string) => {
    setGroupPassages((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddSubQuestionToGroup = (groupId: string) => {
    setGroupPassages((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextQNum = g.questions.length + 1;
        const newSub: SubQuestion = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
          questionNumber: nextQNum,
          questionText: 'What does the speaker suggest the listeners do?',
          options: [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' },
          ],
          correctOption: 'A',
          explanation: '',
          translation: '',
        };
        return { ...g, questions: [...g.questions, newSub] };
      })
    );
  };

  const handleUpdateSubQuestion = (
    groupId: string,
    subId: string,
    updates: Partial<SubQuestion>
  ) => {
    setGroupPassages((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.map((sub) => (sub.id === subId ? { ...sub, ...updates } : sub)),
        };
      })
    );
  };

  const handleDeleteSubQuestion = (groupId: string, subId: string) => {
    setGroupPassages((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.filter((sub) => sub.id !== subId),
        };
      })
    );
  };

  // ==============================================================
  // LOGIC: THÊM TỪ DATA (SUPABASE QUERIES)
  // ==============================================================
  const handleOpenDatabaseModal = async () => {
    setIsDataModalOpen(true);
    setFetchingData(true);

    try {
      if (supabase) {
        // Query bảng 'tests' trong Supabase
        const { data, error } = await supabase
          .from('tests')
          .select('id, title, total_questions, created_at')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          setAvailableTests(data);
          setSelectedTestId(data[0].id);
        } else {
          // Thử bảng dự phòng 'exams'
          const { data: examsData } = await supabase
            .from('exams')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });

          if (Array.isArray(examsData) && examsData.length > 0) {
            const mapped = examsData.map((e) => ({
              id: e.id,
              title: e.title,
              total_questions: 200,
              created_at: e.created_at,
            }));
            setAvailableTests(mapped);
            setSelectedTestId(mapped[0].id);
          } else {
            setAvailableTests(DEFAULT_SAMPLE_BANKS);
            setSelectedTestId(DEFAULT_SAMPLE_BANKS[0].id);
          }
        }
      } else {
        setAvailableTests(DEFAULT_SAMPLE_BANKS);
        setSelectedTestId(DEFAULT_SAMPLE_BANKS[0].id);
      }
    } catch {
      setAvailableTests(DEFAULT_SAMPLE_BANKS);
      setSelectedTestId(DEFAULT_SAMPLE_BANKS[0].id);
    } finally {
      setFetchingData(false);
    }
  };

  // Load Part Questions for Mode 2
  useEffect(() => {
    if (!isDataModalOpen || dataModalMode !== 'part_only') return;

    const fetchPartQuestions = async () => {
      setLoadingQuestions(true);
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('part_number', activePart)
            .order('question_number', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            setAvailablePartQuestions(data);
            setSelectedQuestionIds(data.map((q) => String(q.id || q.question_number)));
            return;
          }
        }
        // Fallback sample questions for the selected part
        const samplePartQs = generateSamplePartQuestions(activePart);
        setAvailablePartQuestions(samplePartQs);
        setSelectedQuestionIds(samplePartQs.map((q) => q.id));
      } catch {
        const samplePartQs = generateSamplePartQuestions(activePart);
        setAvailablePartQuestions(samplePartQs);
        setSelectedQuestionIds(samplePartQs.map((q) => q.id));
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchPartQuestions();
  }, [isDataModalOpen, dataModalMode, activePart]);

  // Execute Nạp dữ liệu từ Supabase
  const handleConfirmDataImport = async () => {
    try {
      setFetchingData(true);

      if (dataModalMode === 'full_test') {
        let loadedQuestions: any[] = [];

        // 1. Fetch từ bảng 'questions' theo test_id
        if (supabase && selectedTestId && !selectedTestId.startsWith('bank-')) {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', selectedTestId)
            .order('question_number', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            loadedQuestions = data;
          }
        }

        // Nếu database chưa có, dùng bộ câu hỏi Full Test 200 câu TOEIC chuẩn hóa
        if (loadedQuestions.length === 0) {
          loadedQuestions = generateFullToeicQuestions200();
        }

        // Phân bổ câu hỏi vào State
        const newSingles: SingleQuestion[] = [];
        const newGroups: GroupPassage[] = [];

        // Part 1, 2, 5
        loadedQuestions.forEach((q: any) => {
          const part = Number(q.part_number || q.partNumber || 1);
          const qNum = Number(q.question_number || q.questionNumber || 1);
          const isPart2 = part === 2;

          if (part === 1 || part === 2 || part === 5) {
            newSingles.push({
              id: `db-single-${part}-${qNum}-${Date.now()}`,
              partNumber: part,
              questionNumber: qNum,
              difficulty: q.difficulty || 'medium',
              audioUrl: q.audio_url || q.audioUrl || '',
              imageUrl: q.image_url || q.imageUrl || '',
              transcript: q.transcript || '',
              questionText: q.question_text || q.questionText || '',
              options: parseOptions(q.options, isPart2),
              correctOption: q.correct_option || q.correctOption || 'A',
              translation: q.translation || '',
              explanation: q.explanation || '',
            });
          }
        });

        // Part 3, 4, 6, 7 (Nhóm theo 3 câu hỏi cho Part 3-4 và đoạn văn cho Part 6-7)
        [3, 4, 6, 7].forEach((partNum) => {
          const partQs = loadedQuestions.filter(
            (q: any) => Number(q.part_number || q.partNumber) === partNum
          );
          const chunkSize = partNum >= 6 ? 4 : 3;

          for (let i = 0; i < partQs.length; i += chunkSize) {
            const chunk = partQs.slice(i, i + chunkSize);
            const first = chunk[0];
            const groupNum = Math.floor(i / chunkSize) + 1;
            const startQ = Number(first.question_number || first.questionNumber || i + 1);
            const endQ = startQ + chunk.length - 1;

            newGroups.push({
              id: `db-group-${partNum}-${groupNum}-${Date.now()}`,
              partNumber: partNum,
              groupTitle: `Đoạn văn ${groupNum} (Câu ${startQ} - ${endQ})`,
              difficulty: first.difficulty || 'medium',
              audioUrl: first.audio_url || first.audioUrl || '',
              transcript: first.transcript || '',
              passageText:
                first.passage_text ||
                first.passageText ||
                'Questions refer to the following conversation / article.',
              questions: chunk.map((sub: any, sIdx: number) => {
                const rawCorr = (sub.correct_option || sub.correctOption || sub.answer || 'A')
                  .toString()
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                return {
                  id: `sub-p${partNum}-g${groupNum}-q${sIdx + 1}-${Math.random().toString(36).substr(2, 6)}`,
                  questionNumber: Number(sub.question_number || sub.questionNumber || startQ + sIdx),
                  questionText: sub.question_text || sub.questionText || 'What does the speaker indicate?',
                  options: parseOptions(sub.options, false),
                  correctOption: ['A', 'B', 'C', 'D'].includes(rawCorr) ? rawCorr : 'A',
                  explanation: sub.explanation || '',
                  translation: sub.translation || '',
                };
              }),
            });
          }
        });

        setSingleQuestions(newSingles);
        setGroupPassages(newGroups);
        const totalLoaded = newSingles.length + newGroups.reduce((s, g) => s + g.questions.length, 0);

        toast.success(`Đã nạp thành công toàn bộ ${totalLoaded} câu hỏi từ bài thi!`);
      } else {
        // Chế độ 2: Lấy câu hỏi theo Part hiện tại
        const selectedQuestions = availablePartQuestions.filter((q) =>
          selectedQuestionIds.includes(String(q.id))
        );

        if (currentPartMeta.type === 'single') {
          const formatted = selectedQuestions.map((q, idx) => ({
            id: `part-db-${activePart}-${idx}-${Date.now()}`,
            partNumber: activePart,
            questionNumber: idx + 1,
            difficulty: q.difficulty || 'medium',
            audioUrl: q.audio_url || q.audioUrl || '',
            imageUrl: q.image_url || q.imageUrl || '',
            transcript: q.transcript || '',
            questionText: q.question_text || q.questionText || '',
            options: parseOptions(q.options, activePart === 2),
            correctOption: q.correct_option || q.correctOption || 'A',
            translation: q.translation || '',
            explanation: q.explanation || '',
          }));

          setSingleQuestions((prev) => [
            ...prev.filter((q) => q.partNumber !== activePart),
            ...formatted,
          ]);
        } else {
          // Group passage for current part
          const chunkSize = activePart >= 6 ? 4 : 3;
          const newGroupsForPart: GroupPassage[] = [];

          for (let i = 0; i < selectedQuestions.length; i += chunkSize) {
            const chunk = selectedQuestions.slice(i, i + chunkSize);
            const first = chunk[0];
            const groupIndex = Math.floor(i / chunkSize) + 1;

            newGroupsForPart.push({
              id: `group-part-${activePart}-${groupIndex}-${Date.now()}`,
              partNumber: activePart,
              groupTitle: `Đoạn văn ${groupIndex} (Part ${activePart})`,
              difficulty: first.difficulty || 'medium',
              audioUrl: first.audio_url || first.audioUrl || '',
              transcript: first.transcript || '',
              passageText: first.passage_text || first.passageText || 'Reading passage content...',
              questions: chunk.map((sub: any, sIdx: number) => {
                const rawCorr = (sub.correct_option || sub.correctOption || sub.answer || 'A')
                  .toString()
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                return {
                  id: `sub-part-${activePart}-g${groupIndex}-q${sIdx + 1}-${Math.random().toString(36).substr(2, 6)}`,
                  questionNumber: sIdx + 1,
                  questionText: sub.question_text || sub.questionText || '',
                  options: parseOptions(sub.options, false),
                  correctOption: ['A', 'B', 'C', 'D'].includes(rawCorr) ? rawCorr : 'A',
                  explanation: sub.explanation || '',
                  translation: sub.translation || '',
                };
              }),
            });
          }

          setGroupPassages((prev) => [
            ...prev.filter((g) => g.partNumber !== activePart),
            ...newGroupsForPart,
          ]);
        }

        toast.success(
          `Đã nạp thành công ${selectedQuestions.length} câu hỏi cho Part ${activePart} từ Database!`
        );
      }

      setIsDataModalOpen(false);
    } catch (err: any) {
      toast.error(`Lỗi nạp dữ liệu: ${err.message}`);
    } finally {
      setFetchingData(false);
    }
  };

  // Final Complete Save to Supabase API
  const handleFinalSave = async () => {
    try {
      setSaving(true);

      const resExam = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examForm),
      });
      const dataExam = await resExam.json();

      if (!resExam.ok || !dataExam.success) {
        throw new Error(dataExam.message || 'Không thể lưu thông tin đề thi');
      }

      const createdExamId = dataExam.data?.exam?.id;

      if (createdExamId) {
        // TỐI ƯU SIÊU TỐC: Gom 200 câu hỏi gửi 1 request duy nhất (Bulk Insert)
        // Đầy đủ audio_url, image_url, transcript, part_number, question_number, options
        const bulkPayload: any[] = [
          ...singleQuestions.map((q) => {
            const cleanOptionsObj: Record<string, string> = {};
            q.options.forEach((opt) => {
              const cleanText = (opt.text || '').replace(/^[A-D][.:)\s-]\s*/i, '').trim();
              cleanOptionsObj[opt.label] = cleanText ? `${opt.label}. ${cleanText}` : `${opt.label}.`;
            });

            return {
              part_number: q.partNumber,
              partNumber: q.partNumber,
              question_number: q.questionNumber,
              questionNumber: q.questionNumber,
              content: q.questionText || `[Part ${q.partNumber}] Câu hỏi số ${q.questionNumber}`,
              question_text: q.questionText || `[Part ${q.partNumber}] Câu hỏi số ${q.questionNumber}`,
              explanation: `${q.explanation || ''}${q.translation ? `\n[Dịch nghĩa]: ${q.translation}` : ''}`,
              points: 1,
              audio_url: q.audioUrl || null,
              audioUrl: q.audioUrl || null,
              image_url: q.imageUrl || null,
              imageUrl: q.imageUrl || null,
              transcript: q.transcript || null,
              difficulty: q.difficulty || 'medium',
              correct_option: q.correctOption || 'A',
              options: cleanOptionsObj,
              answers: q.options.map((opt) => {
                const cleanText = (opt.text || '').replace(/^[A-D][.:)\s-]\s*/i, '').trim();
                return {
                  content: cleanText ? `${opt.label}. ${cleanText}` : `${opt.label}.`,
                  is_correct: opt.label.toUpperCase() === (q.correctOption || 'A').toUpperCase(),
                };
              }),
            };
          }),
          ...groupPassages.flatMap((g) =>
            g.questions.map((sub) => {
              const cleanOptionsObj: Record<string, string> = {};
              sub.options.forEach((opt) => {
                const cleanText = (opt.text || '').replace(/^[A-D][.:)\s-]\s*/i, '').trim();
                cleanOptionsObj[opt.label] = cleanText ? `${opt.label}. ${cleanText}` : `${opt.label}.`;
              });

              return {
                part_number: g.partNumber,
                partNumber: g.partNumber,
                question_number: sub.questionNumber,
                questionNumber: sub.questionNumber,
                content: `${g.passageText ? `[Đoạn văn]:\n${g.passageText}\n\n` : ''}${sub.questionText}`,
                question_text: sub.questionText,
                passage_text: g.passageText || null,
                explanation: `${sub.explanation || ''}${sub.translation ? `\n[Dịch nghĩa]: ${sub.translation}` : ''}`,
                points: 1,
                audio_url: g.audioUrl || null,
                audioUrl: g.audioUrl || null,
                image_url: g.passageImageUrl || null,
                imageUrl: g.passageImageUrl || null,
                transcript: g.transcript || null,
                difficulty: g.difficulty || 'medium',
                correct_option: sub.correctOption || 'A',
                options: cleanOptionsObj,
                answers: sub.options.map((opt) => {
                  const cleanText = (opt.text || '').replace(/^[A-D][.:)\s-]\s*/i, '').trim();
                  return {
                    content: cleanText ? `${opt.label}. ${cleanText}` : `${opt.label}.`,
                    is_correct: opt.label.toUpperCase() === (sub.correctOption || 'A').toUpperCase(),
                  };
                }),
              };
            })
          ),
        ];

        if (bulkPayload.length > 0) {
          const resQuestions = await fetch(`/api/admin/exams/${createdExamId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bulk: bulkPayload }),
          });
          const dataQuestions = await resQuestions.json();
          if (!resQuestions.ok || !dataQuestions.success) {
            console.error('Lỗi bulk insert câu hỏi:', dataQuestions.message);
            throw new Error(dataQuestions.message || 'Lỗi lưu danh sách câu hỏi vào hệ thống');
          }
        }
      }

      localStorage.removeItem('toeic_exam_creator_draft');
      toast.success('Tạo đề thi TOEIC và hệ thống câu hỏi thành công!');
      router.push('/admin/exams');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu đề thi');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!hasAccess) return null;

  const currentPartMeta = TOEIC_PARTS_META.find((p) => p.partNumber === activePart)!;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-transparent -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      {/* ============================================================== */}
      {/* BƯỚC 1: THIẾT LẬP THÔNG TIN ĐỀ THI                             */}
      {/* ============================================================== */}
      {currentStep === 1 && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/exams"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tạo đề thi mới</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bước 1 — Thiết lập thông tin đề thi
              </p>
            </div>
          </div>

          <form
            onSubmit={handleStep1Submit}
            className="bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-7 space-y-5"
          >
            {step1Error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {step1Error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Tên đề thi *</label>
                <input
                  className={inputClass}
                  value={examForm.title}
                  onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="TOEIC Listening Practice Set 01"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Mã đề</label>
                <input
                  className={inputClass}
                  value={examForm.code}
                  onChange={(e) => setExamForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="TOEIC-L-01"
                />
              </div>

              <div>
                <label className={labelClass}>Phân môn / Môn học</label>
                <input
                  className={inputClass}
                  value={examForm.subject}
                  onChange={(e) => setExamForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="TOEIC"
                />
              </div>

              <div>
                <label className={labelClass}>Hình thức kiểm tra</label>
                <select
                  className={inputClass}
                  value={examForm.exam_type}
                  onChange={(e) =>
                    setExamForm((f) => ({ ...f, exam_type: e.target.value as 'practice' | 'graded' }))
                  }
                >
                  <option value="practice">Tự luyện</option>
                  <option value="graded">Chấm điểm</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Giống AZtest: Tự luyện hoặc Chấm điểm
                </p>
              </div>

              <div>
                <label className={labelClass}>Phương thức nhập câu hỏi</label>
                <select
                  className={inputClass}
                  value={examForm.question_input_method}
                  onChange={(e) =>
                    setExamForm((f) => ({
                      ...f,
                      question_input_method: e.target.value as 'manual' | 'bank' | 'import',
                    }))
                  }
                >
                  <option value="manual">Nhập thủ công</option>
                  <option value="import">Import từ JSON / Excel</option>
                  <option value="bank">Từ ngân hàng câu hỏi</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Thời gian (phút)</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={examForm.duration_minutes}
                  onChange={(e) =>
                    setExamForm((f) => ({ ...f, duration_minutes: Number(e.target.value) || 1 }))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Tổng điểm</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={examForm.total_score}
                  onChange={(e) =>
                    setExamForm((f) => ({ ...f, total_score: Number(e.target.value) || 1 }))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Điểm đạt</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={examForm.pass_score}
                  onChange={(e) =>
                    setExamForm((f) => ({ ...f, pass_score: Number(e.target.value) || 0 }))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Kiểu hiển thị lời giải</label>
                <select
                  className={inputClass}
                  value={examForm.show_explanation}
                  onChange={(e) =>
                    setExamForm((f) => ({
                      ...f,
                      show_explanation: e.target.value as 'none' | 'below' | 'popup',
                    }))
                  }
                >
                  <option value="below">Hiển thị bên dưới câu hỏi</option>
                  <option value="popup">Chỉ hiển thị sau khi nộp bài</option>
                  <option value="none">Không hiển thị</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Trạng thái</label>
                <select
                  className={inputClass}
                  value={examForm.status}
                  onChange={(e) =>
                    setExamForm((f) => ({
                      ...f,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    }))
                  }
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Mô tả</label>
              <textarea
                className={`${inputClass} min-h-[90px]`}
                value={examForm.description}
                onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả ngắn về đề thi..."
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={examForm.shuffle_questions}
                  onChange={(e) =>
                    setExamForm((f) => ({ ...f, shuffle_questions: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                Xáo trộn câu hỏi
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={examForm.shuffle_answers}
                  onChange={(e) =>
                    setExamForm((f) => ({ ...f, shuffle_answers: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                Xáo trộn đáp án
              </label>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <Link
                href="/admin/exams"
                className="px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                Hủy
              </Link>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Cập nhật & tiếp tục câu hỏi
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* BƯỚC 2: NHẬP VÀ QUẢN LÝ CÂU HỎI                                */}
      {/* ============================================================== */}
      {currentStep === 2 && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Bar Navigation */}
          <div className="bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Quay lại Bước 1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                    Quản lý câu hỏi: {examForm.title || 'Đề thi mới'}
                  </h1>
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {totalQuestionsAdded}/200 câu
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bước 2 — Nhập câu hỏi chi tiết theo 7 Part chuẩn cấu trúc TOEIC ETS
                </p>
              </div>
            </div>

            {/* Top Action Buttons: Thêm từ Data | Import JSON | Hoàn tất */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* NÚT MỚI: THÊM TỪ DATA (SUPABASE) */}
              <button
                type="button"
                onClick={handleOpenDatabaseModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shadow-2xs"
                title="Lấy câu hỏi có sẵn từ Supabase Database nạp vào form hiện tại"
              >
                <Database className="w-4 h-4 text-blue-600" />
                Thêm từ Data
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-blue-600" />
                Import nhanh từ JSON
              </button>

              <button
                type="button"
                onClick={handleFinalSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Hoàn tất & Lưu đề thi'}
              </button>
            </div>
          </div>

          {/* Layout 2 cột: Cột trái (Sidebar 260px) + Cột phải (Chi tiết câu hỏi) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI (Sidebar 260px - 3 cols) */}
            <div className="lg:col-span-3 bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 sticky top-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Các phần thi (7 Parts)
                </span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {totalQuestionsAdded} câu
                </span>
              </div>

              <div className="space-y-1.5">
                {TOEIC_PARTS_META.map((part) => {
                  const count = countPartQuestions(part.partNumber);
                  const isFull = count >= part.targetCount;
                  const isActive = activePart === part.partNumber;

                  return (
                    <button
                      key={part.partNumber}
                      type="button"
                      onClick={() => setActivePart(part.partNumber)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition cursor-pointer border ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                          : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold leading-tight line-clamp-1">
                          Part {part.partNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          {part.desc}
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                          isFull
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : count > 0
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/10'
                        }`}
                      >
                        {count}/{part.targetCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Tiến độ toàn bộ đề</span>
                  <span>{Math.round((totalQuestionsAdded / 200) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, (totalQuestionsAdded / 200) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (Chi tiết câu hỏi - 9 cols) */}
            <div className="lg:col-span-9 space-y-5">
              <div className="bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-xs font-extrabold px-2 py-0.5 rounded">
                      Part {currentPartMeta.partNumber}
                    </span>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                      {currentPartMeta.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {currentPartMeta.desc} — Mục tiêu: {currentPartMeta.targetCount} câu hỏi
                  </p>
                </div>

                {currentPartMeta.type === 'single' ? (
                  <button
                    type="button"
                    onClick={() => handleAddSingleQuestion(activePart)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm câu hỏi Part {activePart}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddGroupPassage(activePart)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" /> Thêm nhóm đoạn văn Part {activePart}
                  </button>
                )}
              </div>

              {/* DẠNG A: CÂU HỎI ĐƠN LẺ (Part 1, 2, 5) */}
              {currentPartMeta.type === 'single' && (
                <div className="space-y-5">
                  {singleQuestions
                    .filter((q) => q.partNumber === activePart)
                    .map((q, idx) => (
                      <div
                        key={q.id}
                        className="bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-white text-sm">
                              Câu số {q.questionNumber || idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={q.difficulty}
                              onChange={(e) =>
                                handleUpdateSingleQuestion(q.id, {
                                  difficulty: e.target.value as any,
                                })
                              }
                              className="px-2.5 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200"
                            >
                              <option value="easy">Độ khó: Dễ</option>
                              <option value="medium">Độ khó: Trung bình</option>
                              <option value="hard">Độ khó: Khó</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteSingleQuestion(q.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                              title="Xóa câu hỏi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {(activePart === 1 || activePart === 2) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                                <Music className="w-3.5 h-3.5 text-blue-600" />
                                File Audio MP3
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Dán link MP3 hoặc tải lên..."
                                  value={q.audioUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateSingleQuestion(q.id, { audioUrl: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                                />
                                <label className="shrink-0 px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" />
                                  Tải file
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const url = URL.createObjectURL(file);
                                        handleUpdateSingleQuestion(q.id, { audioUrl: url });
                                        toast.success('Đã tải âm thanh MP3 xem trước!');
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              {q.audioUrl && (
                                <div className="pt-1">
                                  <audio controls src={q.audioUrl} className="w-full h-8" />
                                </div>
                              )}
                            </div>

                            {activePart === 1 && (
                              <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                                  Ảnh mô tả (Picture)
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Dán link ảnh hoặc tải lên..."
                                    value={q.imageUrl || ''}
                                    onChange={(e) =>
                                      handleUpdateSingleQuestion(q.id, { imageUrl: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                                  />
                                  <label className="shrink-0 px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1">
                                    <Upload className="w-3.5 h-3.5" />
                                    Tải ảnh
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const url = URL.createObjectURL(file);
                                          handleUpdateSingleQuestion(q.id, { imageUrl: url });
                                          toast.success('Đã tải ảnh xem trước!');
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                                {q.imageUrl && (
                                  <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                                    <img
                                      src={q.imageUrl}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {(activePart === 1 || activePart === 2) && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Transcript đoạn nghe tiếng Anh
                            </label>
                            <textarea
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-200 min-h-[60px]"
                              value={q.transcript || ''}
                              onChange={(e) =>
                                handleUpdateSingleQuestion(q.id, { transcript: e.target.value })
                              }
                              placeholder="(A) The woman is holding a document... (B) She is sitting..."
                            />
                          </div>
                        )}

                        {activePart === 5 && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Câu hỏi đề bài tiếng Anh *
                            </label>
                            <textarea
                              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-100 min-h-[70px]"
                              value={q.questionText}
                              onChange={(e) =>
                                handleUpdateSingleQuestion(q.id, { questionText: e.target.value })
                              }
                              placeholder="Nhập câu đề bài tiếng Anh (sử dụng _____ cho chỗ trống)..."
                            />
                          </div>
                        )}

                        <div className="space-y-2.5">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Các phương án trả lời (Tích chọn nút tròn cho đáp án đúng *)
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.correctOption === opt.label;
                              return (
                                <div
                                  key={opt.label}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                                    isCorrect
                                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'
                                  }`}
                                >
                                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0 pl-1">
                                    <input
                                      type="radio"
                                      name={`correct-${q.id}`}
                                      checked={isCorrect}
                                      onChange={() =>
                                        handleUpdateSingleQuestion(q.id, {
                                          correctOption: opt.label,
                                        })
                                      }
                                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span
                                      className={`text-xs font-extrabold w-5 h-5 rounded-md flex items-center justify-center ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                  </label>

                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => {
                                      const nextOpts = [...q.options];
                                      nextOpts[oIdx].text = e.target.value;
                                      handleUpdateSingleQuestion(q.id, { options: nextOpts });
                                    }}
                                    placeholder={`Nội dung đáp án ${opt.label}...`}
                                    className="w-full px-2.5 py-1.5 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Bản dịch nghĩa tiếng Việt
                            </label>
                            <textarea
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-200 min-h-[55px]"
                              value={q.translation || ''}
                              onChange={(e) =>
                                handleUpdateSingleQuestion(q.id, { translation: e.target.value })
                              }
                              placeholder="Dịch nghĩa câu / đoạn thoại..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Giải thích chi tiết ngữ pháp / từ vựng
                            </label>
                            <textarea
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-200 min-h-[55px]"
                              value={q.explanation || ''}
                              onChange={(e) =>
                                handleUpdateSingleQuestion(q.id, { explanation: e.target.value })
                              }
                              placeholder="Giải thích vì sao chọn đáp án đúng..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                  {singleQuestions.filter((q) => q.partNumber === activePart).length === 0 && (
                    <div className="bg-white dark:bg-[#1A2417] border border-dashed border-slate-300 dark:border-white/15 rounded-2xl p-12 text-center space-y-3">
                      <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Chưa có câu hỏi nào cho Part {activePart}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddSingleQuestion(activePart)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Bắt đầu thêm câu hỏi Part {activePart}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* DẠNG B: NHÓM CÂU HỎI / ĐOẠN VĂN CHUNG (Part 3, 4, 6, 7) */}
              {currentPartMeta.type === 'group' && (
                <div className="space-y-6">
                  {groupPassages
                    .filter((g) => g.partNumber === activePart)
                    .map((group, gIdx) => (
                      <div
                        key={group.id}
                        className="bg-white dark:bg-[#1A2417] border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-lg">
                              Đoạn #{gIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={group.groupTitle}
                              onChange={(e) =>
                                handleUpdateGroup(group.id, { groupTitle: e.target.value })
                              }
                              className="font-bold text-slate-800 dark:text-white text-base bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={group.difficulty}
                              onChange={(e) =>
                                handleUpdateGroup(group.id, { difficulty: e.target.value as any })
                              }
                              className="px-2.5 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200"
                            >
                              <option value="easy">Độ khó: Dễ</option>
                              <option value="medium">Độ khó: Trung bình</option>
                              <option value="hard">Độ khó: Khó</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                              title="Xóa nhóm đoạn văn này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50/70 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-4">
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                            Tài nguyên dùng chung cho cả đoạn
                          </span>

                          {(activePart === 3 || activePart === 4) && (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Link MP3 cho cả cụm câu hỏi..."
                                  value={group.audioUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateGroup(group.id, { audioUrl: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                                />
                                <label className="shrink-0 px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" /> Tải audio
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const url = URL.createObjectURL(file);
                                        handleUpdateGroup(group.id, { audioUrl: url });
                                        toast.success('Đã tải âm thanh đoạn hội thoại!');
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              {group.audioUrl && (
                                <audio controls src={group.audioUrl} className="w-full h-8" />
                              )}
                              <textarea
                                className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-800 dark:text-slate-200 min-h-[70px]"
                                value={group.transcript || ''}
                                onChange={(e) =>
                                  handleUpdateGroup(group.id, { transcript: e.target.value })
                                }
                                placeholder="Transcript bài nghe hội thoại chung..."
                              />
                            </div>
                          )}

                          {(activePart === 6 || activePart === 7) && (
                            <div className="space-y-3">
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Đoạn văn đọc hiểu (Reading Passage) *
                              </label>
                              <textarea
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 min-h-[140px] font-mono leading-relaxed"
                                value={group.passageText || ''}
                                onChange={(e) =>
                                  handleUpdateGroup(group.id, { passageText: e.target.value })
                                }
                                placeholder="Dán nội dung bài đọc tiếng Anh (Email, Article, Announcement, Schedule, Message Chain...)..."
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Các câu hỏi trong đoạn này ({group.questions.length} câu)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddSubQuestionToGroup(group.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi vào đoạn này
                            </button>
                          </div>

                          <div className="space-y-4 pl-3 border-l-2 border-blue-500/30">
                            {group.questions.map((sub, sIdx) => (
                              <div
                                key={sub.id}
                                className="bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                                    Câu hỏi {sIdx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubQuestion(group.id, sub.id)}
                                    className="text-slate-400 hover:text-red-500 text-xs cursor-pointer"
                                    title="Xóa câu con"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <input
                                  type="text"
                                  value={sub.questionText}
                                  onChange={(e) =>
                                    handleUpdateSubQuestion(group.id, sub.id, {
                                      questionText: e.target.value,
                                    })
                                  }
                                  placeholder="Nhập câu hỏi tiếng Anh..."
                                  className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {sub.options.map((opt, oIdx) => {
                                    const isCorrect = (sub.correctOption || 'A').toUpperCase() === opt.label.toUpperCase();
                                    return (
                                      <div
                                        key={opt.label}
                                        onClick={() =>
                                          handleUpdateSubQuestion(group.id, sub.id, {
                                            correctOption: opt.label,
                                          })
                                        }
                                        className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer ${
                                          isCorrect
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm shadow-emerald-500/10'
                                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-slate-300'
                                        }`}
                                      >
                                        <label className="flex items-center gap-1.5 cursor-pointer shrink-0 pl-1">
                                          <input
                                            type="radio"
                                            name={`sub-correct-${group.id}-${sub.id}`}
                                            checked={isCorrect}
                                            onChange={() =>
                                              handleUpdateSubQuestion(group.id, sub.id, {
                                                correctOption: opt.label,
                                              })
                                            }
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                          />
                                          <span
                                            className={`text-xs font-extrabold w-5 h-5 rounded-md flex items-center justify-center transition ${
                                              isCorrect
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                                            }`}
                                          >
                                            {opt.label}
                                          </span>
                                        </label>

                                        <input
                                          type="text"
                                          value={opt.text}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            const nextOpts = [...sub.options];
                                            nextOpts[oIdx].text = e.target.value;
                                            handleUpdateSubQuestion(group.id, sub.id, {
                                              options: nextOpts,
                                            });
                                          }}
                                          placeholder={`Nội dung phương án ${opt.label}...`}
                                          className="w-full px-2 py-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>

                                <input
                                  type="text"
                                  value={sub.explanation || ''}
                                  onChange={(e) =>
                                    handleUpdateSubQuestion(group.id, sub.id, {
                                      explanation: e.target.value,
                                    })
                                  }
                                  placeholder="Giải thích đáp án cho câu hỏi này..."
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-600 dark:text-slate-300"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                  {groupPassages.filter((g) => g.partNumber === activePart).length === 0 && (
                    <div className="bg-white dark:bg-[#1A2417] border border-dashed border-slate-300 dark:border-white/15 rounded-2xl p-12 text-center space-y-3">
                      <FolderPlus className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Chưa có nhóm đoạn văn nào cho Part {activePart}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddGroupPassage(activePart)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Bắt đầu tạo đoạn văn Part {activePart}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CHỌN NGUỒN CÂU HỎI TỪ HỆ THỐNG (THÊM TỪ DATA)        */}
      {/* ============================================================== */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Chọn nguồn câu hỏi từ hệ thống
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lấy câu hỏi đã có sẵn từ Supabase Database nạp vào form hiện tại
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDataModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher: 2 Chế độ */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDataModalMode('full_test')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  dataModalMode === 'full_test'
                    ? 'bg-white dark:bg-white/15 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                1. Sao chép nguyên bài thi
              </button>

              <button
                type="button"
                onClick={() => setDataModalMode('part_only')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  dataModalMode === 'part_only'
                    ? 'bg-white dark:bg-white/15 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                2. Lấy theo Part {activePart}
              </button>
            </div>

            {/* Content Chế độ 1: Sao chép nguyên bài thi */}
            {dataModalMode === 'full_test' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                    Chọn bài thi có sẵn từ bảng `tests` (Supabase)
                  </label>
                  {fetchingData ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader className="w-4 h-4 animate-spin text-blue-600" />
                      Đang tải danh sách bài thi từ database...
                    </div>
                  ) : (
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableTests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.total_questions || 200} câu hỏi)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Test Preview Card */}
                {selectedTestId && (
                  <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                      <span>Thông tin gói đề thi:</span>
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">
                        200 câu hỏi · 7 Parts
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Hệ thống sẽ nạp toàn bộ câu hỏi (Part 1 ➔ Part 7) cùng với File Audio, Ảnh tranh,
                      Transcript, các phương án A-B-C-D và lời giải chi tiết vào form.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Content Chế độ 2: Lấy câu hỏi theo Part hiện tại */}
            {dataModalMode === 'part_only' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Danh sách câu hỏi Part {activePart} trong Database ({availablePartQuestions.length} câu)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedQuestionIds.length === availablePartQuestions.length) {
                        setSelectedQuestionIds([]);
                      } else {
                        setSelectedQuestionIds(availablePartQuestions.map((q) => String(q.id)));
                      }
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    {selectedQuestionIds.length === availablePartQuestions.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                </div>

                {loadingQuestions ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader className="w-4 h-4 animate-spin text-blue-600" />
                    Đang tìm kiếm câu hỏi Part {activePart}...
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-white/10 rounded-xl max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {availablePartQuestions.map((q, idx) => {
                      const qId = String(q.id);
                      const isChecked = selectedQuestionIds.includes(qId);
                      return (
                        <label
                          key={qId}
                          className="flex items-start gap-2.5 p-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedQuestionIds((prev) =>
                                prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
                              );
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div className="space-y-0.5 flex-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Câu {idx + 1}:{' '}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {q.question_text || q.transcript || q.questionText || `[Part ${activePart}] Câu hỏi`}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsDataModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDataImport}
                disabled={fetchingData}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {fetchingData ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Đang nạp dữ liệu...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Xác nhận nạp dữ liệu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: IMPORT NHANH TỪ JSON                                  */}
      {/* ============================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A2417] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Import nhanh câu hỏi từ JSON
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dán mảng JSON chứa các câu hỏi TOEIC đã chuẩn hóa. Hệ thống sẽ tự động bóc tách và gán
              vào đúng 7 Parts tương ứng.
            </p>

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl">
                {importError}
              </div>
            )}

            <textarea
              className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 min-h-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`[\n  {\n    "partNumber": 1,\n    "questionNumber": 1,\n    "audioUrl": "https://...",\n    "imageUrl": "https://...",\n    "transcript": "A man is walking...",\n    "options": ["A. He is...", "B. She is...", "C. They are...", "D. It is..."],\n    "correctOption": "A",\n    "explanation": "..."\n  }\n]`}
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setImportJsonText(
                    JSON.stringify(
                      [
                        {
                          partNumber: 1,
                          questionNumber: 1,
                          audioUrl: 'https://cdn.example.com/toeic-part1-01.mp3',
                          imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
                          transcript:
                            '(A) The woman is sitting at a desk.\n(B) The woman is walking outdoors.\n(C) The woman is opening a window.\n(D) The woman is writing on a chalkboard.',
                          options: ['A', 'B', 'C', 'D'],
                          correctOption: 'A',
                          explanation: 'Người phụ nữ đang ngồi tại bàn làm việc.',
                        },
                        {
                          partNumber: 5,
                          questionNumber: 101,
                          questionText:
                            'Ms. Tanaka has requested that the financial report be delivered to _____ office by noon.',
                          options: ['she', 'her', 'hers', 'herself'],
                          correctOption: 'B',
                          explanation: 'Cần tính từ sở hữu đứng trước danh từ "office".',
                        },
                      ],
                      null,
                      2
                    )
                  );
                }}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                + Dán dữ liệu mẫu (Sample JSON)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportError(null);
                    try {
                      const parsed = JSON.parse(importJsonText);
                      if (!Array.isArray(parsed)) {
                        setImportError('Dữ liệu JSON phải là một mảng []');
                        return;
                      }

                      const newSingles: SingleQuestion[] = [];
                      const newGroups: GroupPassage[] = [];

                      parsed.forEach((q: any) => {
                        const part = Number(q.part_number || q.partNumber || 1);
                        const qNum = Number(q.question_number || q.questionNumber || 1);
                        const isPart2 = part === 2;

                        if (part === 1 || part === 2 || part === 5) {
                          newSingles.push({
                            id: `json-single-${part}-${qNum}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            partNumber: part,
                            questionNumber: qNum,
                            difficulty: q.difficulty || 'medium',
                            audioUrl: q.audio_url || q.audioUrl || '',
                            imageUrl: q.image_url || q.imageUrl || '',
                            transcript: q.transcript || '',
                            questionText: q.question_text || q.questionText || '',
                            options: parseOptions(q.options, isPart2),
                            correctOption: (q.correct_option || q.correctOption || 'A').toString().trim().charAt(0).toUpperCase() || 'A',
                            translation: q.translation || '',
                            explanation: q.explanation || '',
                          });
                        }
                      });

                      [3, 4, 6, 7].forEach((partNum) => {
                        const partQs = parsed.filter(
                          (q: any) => Number(q.part_number || q.partNumber) === partNum
                        );
                        if (partQs.length === 0) return;
                        const chunkSize = partNum >= 6 ? 4 : 3;

                        for (let i = 0; i < partQs.length; i += chunkSize) {
                          const chunk = partQs.slice(i, i + chunkSize);
                          const first = chunk[0];
                          const groupNum = Math.floor(i / chunkSize) + 1;
                          const startQ = Number(first.question_number || first.questionNumber || i + 1);
                          const endQ = startQ + chunk.length - 1;

                          newGroups.push({
                            id: `json-group-${partNum}-${groupNum}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            partNumber: partNum,
                            groupTitle: `Đoạn văn ${groupNum} (Câu ${startQ} - ${endQ})`,
                            difficulty: first.difficulty || 'medium',
                            audioUrl: first.audio_url || first.audioUrl || '',
                            transcript: first.transcript || '',
                            passageText:
                              first.passage_text ||
                              first.passageText ||
                              'Questions refer to the following conversation / article.',
                            questions: chunk.map((sub: any, sIdx: number) => {
                              const rawCorr = (sub.correct_option || sub.correctOption || sub.answer || 'A')
                                .toString()
                                .trim()
                                .charAt(0)
                                .toUpperCase();
                              return {
                                id: `sub-p${partNum}-g${groupNum}-q${sIdx + 1}-${Math.random().toString(36).substr(2, 6)}`,
                                questionNumber: Number(sub.question_number || sub.questionNumber || startQ + sIdx),
                                questionText: sub.question_text || sub.questionText || '',
                                options: parseOptions(sub.options, false),
                                correctOption: ['A', 'B', 'C', 'D'].includes(rawCorr) ? rawCorr : 'A',
                                explanation: sub.explanation || '',
                                translation: sub.translation || '',
                              };
                            }),
                          });
                        }
                      });

                      if (newSingles.length > 0) {
                        setSingleQuestions((prev) => [
                          ...prev.filter((q) => !newSingles.some((ns) => ns.partNumber === q.partNumber)),
                          ...newSingles,
                        ]);
                      }
                      if (newGroups.length > 0) {
                        setGroupPassages((prev) => [
                          ...prev.filter((g) => !newGroups.some((ng) => ng.partNumber === g.partNumber)),
                          ...newGroups,
                        ]);
                      }

                      setIsImportModalOpen(false);
                      toast.success(`Đã import thành công ${parsed.length} câu hỏi!`);
                    } catch (e: any) {
                      setImportError(e.message);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  Xác nhận Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================
// UTILITY FUNCTIONS: OPTIONS PARSING & TOEIC QUESTION GENERATORS
// ==============================================================

function parseOptions(rawOptions: any, isPart2 = false): { label: string; text: string }[] {
  const defaultLabels = isPart2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
  if (!rawOptions) {
    return defaultLabels.map((l) => ({ label: l, text: '' }));
  }
  if (Array.isArray(rawOptions)) {
    return rawOptions.map((opt: any, idx: number) => {
      const label = defaultLabels[idx] || String.fromCharCode(65 + idx);
      if (typeof opt === 'string') {
        const text = opt.replace(/^[A-D][.:]\s*/i, '').trim();
        return { label, text: text || opt };
      }
      const rawText = opt.text || opt.content || '';
      const cleanText =
        typeof rawText === 'string' ? rawText.replace(/^[A-D][.:]\s*/i, '').trim() : '';
      return { label: opt.label || label, text: cleanText || rawText };
    });
  }
  if (typeof rawOptions === 'object') {
    return defaultLabels.map((l) => {
      const val = typeof rawOptions[l] === 'string' ? rawOptions[l] : '';
      return {
        label: l,
        text: val.replace(/^[A-D][.:]\s*/i, '').trim() || val,
      };
    });
  }
  return defaultLabels.map((l) => ({ label: l, text: '' }));
}

function generateSamplePartQuestions(partNum: number) {
  const meta = TOEIC_PARTS_META.find((p) => p.partNumber === partNum);
  const count = meta ? meta.targetCount : 10;
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `sample-part-${partNum}-${i}`,
      part_number: partNum,
      question_number: i,
      difficulty: i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy',
      audio_url: 'https://cdn.example.com/audio-sample.mp3',
      image_url:
        partNum === 1 ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400' : '',
      transcript: `(A) Description sentence 1. (B) Description sentence 2. (C) Description sentence 3. (D) Description sentence 4.`,
      question_text:
        partNum === 5
          ? `The management board decided to _____ the deadline for the commercial contract.`
          : `Sample question content for Part ${partNum} - Item #${i}`,
      options:
        partNum === 2
          ? ['In the conference room', 'Yes, yesterday morning', 'Mr. Robert will attend']
          : ['extend', 'extension', 'extensively', 'extended'],
      correct_option: 'A',
      explanation: `Giải thích đáp án cho câu số ${i} thuộc Part ${partNum}.`,
    });
  }
  return list;
}

function generateFullToeicQuestions200(): any[] {
  const result: any[] = [];
  let currentNum = 1;

  // Part 1: 6 câu
  for (let i = 1; i <= 6; i++) {
    result.push({
      part_number: 1,
      question_number: currentNum++,
      difficulty: 'easy',
      audio_url: 'https://cdn.example.com/part1.mp3',
      image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      transcript: '(A) The man is speaking on the telephone. (B) The man is typing on a laptop.',
      question_text: 'Statement matching the photograph',
      options: ['A', 'B', 'C', 'D'],
      correct_option: 'B',
      explanation: 'Người đàn ông đang gõ bàn phím trên máy tính xách tay.',
    });
  }

  // Part 2: 25 câu
  for (let i = 1; i <= 25; i++) {
    result.push({
      part_number: 2,
      question_number: currentNum++,
      difficulty: 'medium',
      audio_url: 'https://cdn.example.com/part2.mp3',
      transcript: 'Where is the annual marketing conference being held this year?',
      question_text: 'Choose the best response',
      options: ['At the Grand Central Hotel.', 'Yes, I attended last year.', 'Next Friday afternoon.'],
      correct_option: 'A',
      explanation: 'Câu hỏi "Where" hỏi địa điểm, đáp án A trả lời đúng vị trí.',
    });
  }

  // Part 3: 39 câu (13 đoạn hội thoại)
  for (let i = 1; i <= 39; i++) {
    result.push({
      part_number: 3,
      question_number: currentNum++,
      difficulty: 'medium',
      audio_url: 'https://cdn.example.com/part3.mp3',
      transcript: 'M: Hello Sarah, have you finished reviewing the revised quarterly budget?',
      question_text: 'What is the conversation mainly about?',
      options: ['Reviewing a budget', 'Booking flights', 'Ordering computers', 'Hiring staff'],
      correct_option: 'A',
      explanation: 'Hội thoại đề cập trực tiếp đến việc xem xét ngân sách quý.',
    });
  }

  // Part 4: 30 câu (10 bài nói)
  for (let i = 1; i <= 30; i++) {
    result.push({
      part_number: 4,
      question_number: currentNum++,
      difficulty: 'hard',
      audio_url: 'https://cdn.example.com/part4.mp3',
      transcript: 'Good morning everyone, welcome to our annual regional orientation seminar.',
      question_text: 'Who most likely is the speaker?',
      options: ['A seminar coordinator', 'A hotel receptionist', 'A tour guide', 'A pilot'],
      correct_option: 'A',
      explanation: 'Người nói chào đón mọi người đến buổi hội thảo định hướng.',
    });
  }

  // Part 5: 30 câu
  for (let i = 1; i <= 30; i++) {
    result.push({
      part_number: 5,
      question_number: currentNum++,
      difficulty: 'medium',
      question_text: `Customer satisfaction remains our utmost _____ as we expand into new overseas markets.`,
      options: ['priority', 'prioritize', 'prior', 'prioritized'],
      correct_option: 'A',
      explanation: 'Cần một danh từ sau tính từ sở hữu "our".',
    });
  }

  // Part 6: 16 câu (4 đoạn)
  for (let i = 1; i <= 16; i++) {
    result.push({
      part_number: 6,
      question_number: currentNum++,
      difficulty: 'medium',
      passage_text: 'Notice to all staff members regarding the upcoming office renovation schedule.',
      question_text: 'Choose the word that best fits the blank.',
      options: ['scheduled', 'scheduling', 'schedule', 'schedules'],
      correct_option: 'A',
      explanation: 'Thể bị động / tính từ phù hợp với ngữ cảnh thông báo.',
    });
  }

  // Part 7: 54 câu
  for (let i = 1; i <= 54; i++) {
    result.push({
      part_number: 7,
      question_number: currentNum++,
      difficulty: 'hard',
      passage_text: 'Email Subject: Invitation to the Global Tech Symposium 2026 in Singapore.',
      question_text: 'According to the letter, what must attendees submit prior to March 15?',
      options: ['A registration form', 'A passport copy', 'A hotel voucher', 'A payment receipt'],
      correct_option: 'A',
      explanation: 'Đoạn văn nêu rõ người tham dự phải nộp đơn đăng ký trước ngày 15/3.',
    });
  }

  return result;
}

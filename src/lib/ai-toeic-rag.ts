import { queryBuilder } from '@/lib/db';

export interface RagChunk {
  source: string;
  content: string;
}

const STATIC_KNOWLEDGE: RagChunk[] = [
  {
    source: 'TOEIC Grammar',
    content:
      'Part 5 Incomplete Sentences: kiểm tra ngữ pháp và từ vựng trong câu đơn. Thường gặp: thì, giới từ, đại từ, liên từ, collocation. Chiến lược: đọc cả câu → xác định loại từ cần điền → loại trừ đáp án sai ngữ pháp → chọn theo collocation.',
  },
  {
    source: 'TOEIC Reading',
    content:
      'Part 7 Reading Comprehension: đọc hiểu email, thông báo, bài báo. Chiến lược: skim chủ đề → scan từ khóa → đối chiếu đáp án. Part 6: đoạn văn có chỗ trống, chú ý đại từ thay thế và liên từ.',
  },
  {
    source: 'TOEIC Listening',
    content:
      'Part 1: mô tả tranh. Part 2 Question-Response: nghe câu hỏi/câu nói ngắn. Part 3-4: hội thoại và talk. Chiến lược Part 2: nhận diện Wh-/Yes-No, câu đề xuất, câu trần thuật.',
  },
  {
    source: 'TOEIC Vocabulary',
    content:
      'Chủ đề thường gặp: office, business meeting, travel, schedule, marketing, HR, finance, technology. Học collocation: make a decision, take responsibility, meet a deadline.',
  },
];

const EXAM_CONTEXT_KEYWORDS =
  /đề|đáp án|câu hỏi|giải thích câu|lời giải|exam|question|answer|toeic test|ngân hàng/i;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function relevanceScore(queryTokens: string[], text: string): number {
  const hay = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) score += 1;
  }
  return score;
}

function buildStaticContext(queryTokens: string[], limit: number): string {
  return STATIC_KNOWLEDGE.map((item) => ({
    ...item,
    score: relevanceScore(queryTokens, item.content) + 1,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => `### ${c.source}\n${c.content}`)
    .join('\n\n');
}

function needsExamBankContext(message: string): boolean {
  return EXAM_CONTEXT_KEYWORDS.test(message);
}

/**
 * RAG-lite: static TOEIC knowledge (fast) + exam bank only when needed
 */
export async function buildToeicRagContext(userMessage: string, limit = 4): Promise<string> {
  const queryTokens = tokenize(userMessage);

  if (!needsExamBankContext(userMessage)) {
    return buildStaticContext(queryTokens, limit);
  }

  const chunks: Array<RagChunk & { score: number }> = [];

  STATIC_KNOWLEDGE.forEach((item) => {
    chunks.push({ ...item, score: relevanceScore(queryTokens, item.content) + 0.5 });
  });

  try {
    const [exams, questions] = await Promise.all([
      queryBuilder<{
        id: string;
        title: string;
        subject: string;
      }>('exams', {
        select: 'id, title, subject',
        filters: { status: 'published' },
        limit: 5,
      }),
      queryBuilder<{
        id: string;
        exam_id: string;
        content: string;
        explanation: string | null;
      }>('exam_questions', {
        select: 'id, exam_id, content, explanation',
        limit: 30,
      }),
    ]);

    if (exams.length === 0) {
      return buildStaticContext(queryTokens, limit);
    }

    const questionIds = questions.map((q) => q.id);
    const answers =
      questionIds.length > 0
        ? await queryBuilder<{
            question_id: string;
            content: string;
            is_correct: boolean;
          }>('exam_answers', {
            select: 'question_id, content, is_correct',
            filters: { question_id: questionIds },
            limit: 120,
          })
        : [];

    const examMap = new Map(exams.map((e) => [e.id, e]));
    const answersByQuestion = new Map<string, typeof answers>();
    for (const a of answers) {
      const list = answersByQuestion.get(a.question_id) ?? [];
      list.push(a);
      answersByQuestion.set(a.question_id, list);
    }

    for (const q of questions) {
      const exam = examMap.get(q.exam_id);
      if (!exam) continue;

      const qAnswers = answersByQuestion.get(q.id) ?? [];
      const correct = qAnswers.find((a) => a.is_correct);
      const block = [
        `[Đề: ${exam.title}]`,
        `Câu: ${q.content}`,
        correct ? `Đáp án: ${correct.content}` : '',
        q.explanation ? `Giải thích: ${q.explanation}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const score = relevanceScore(queryTokens, block);
      if (score > 0) {
        chunks.push({ source: exam.title, content: block, score });
      }
    }
  } catch {
    return buildStaticContext(queryTokens, limit);
  }

  const ranked = chunks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => `### ${c.source}\n${c.content}`)
    .join('\n\n');

  return ranked || buildStaticContext(queryTokens, limit);
}

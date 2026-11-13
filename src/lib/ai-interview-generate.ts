import { geminiGenerateJson, geminiGenerateText } from '@/lib/ai-gemini';
import { parseAiJson, salvageQuestionObjects } from '@/lib/ai-json-parse';
import type { ExperienceLevel, InterviewCategory } from '@/lib/interview-data';
import { CATEGORY_TABS, LEVEL_FILTERS, TECHNOLOGIES, INTERVIEW_QUESTION_MIN, INTERVIEW_QUESTION_MAX } from '@/lib/interview-data';

export type InterviewQuestionPayload = {
  level: ExperienceLevel;
  question: string;
  answer: string;
};

export type GenerateInterviewInput = {
  technologyId: string;
  category: InterviewCategory;
  description?: string;
  questionCount: number;
};

const LEVEL_LABEL = Object.fromEntries(LEVEL_FILTERS.map((l) => [l.id, l.label]));
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_TABS.map((c) => [c.id, c.label]));
const VALID_LEVELS = new Set(['entry', 'junior', 'middle', 'senior', 'expert']);
const BATCH_SIZE = 5;

const INTERVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['level', 'question', 'answer'],
      },
    },
  },
  required: ['questions'],
};

function normalizeQuestions(raw: InterviewQuestionPayload[]): InterviewQuestionPayload[] {
  return raw
    .filter((q) => q?.question?.trim())
    .map((q) => ({
      level: (VALID_LEVELS.has(q.level) ? q.level : 'middle') as ExperienceLevel,
      question: String(q.question).trim(),
      answer: String(q.answer || '').trim(),
    }));
}

function buildBatchPrompt(
  techName: string,
  techIcon: string,
  category: InterviewCategory,
  description: string | undefined,
  batchCount: number,
  batchIndex: number,
  totalCount: number,
  existing: InterviewQuestionPayload[]
): string {
  const exclude =
    existing.length > 0
      ? `\nKHÔNG trùng các câu đã có:\n${existing.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}`
      : '';

  return `Bạn là AI chuyên gia phỏng vấn lập trình viên của NikaLearn.

DANH MỤC: ${CATEGORY_LABEL[category] || category}
CÔNG NGHỆ: ${techName} (${techIcon})
${description ? `MÔ TẢ: ${description}` : ''}
LÔ NÀY: sinh đúng ${batchCount} câu (lô ${batchIndex + 1}, tổng mục tiêu ${totalCount} câu)

Mỗi câu:
- level: entry | junior | middle | senior | expert
- question: câu hỏi phỏng vấn tiếng Việt, ngắn gọn
- answer: đáp án mẫu tiếng Việt, tối đa 3-4 câu (không code dài, không xuống dòng)

Phân bổ đều các level. Câu hỏi thực tế, không trùng.${exclude}

Trả về JSON: {"questions":[{"level":"middle","question":"...","answer":"..."}]}`;
}

async function generateBatch(
  input: GenerateInterviewInput,
  tech: { name: string; icon: string },
  batchCount: number,
  batchIndex: number,
  totalCount: number,
  existing: InterviewQuestionPayload[]
): Promise<{ questions: InterviewQuestionPayload[]; model: string }> {
  const prompt = buildBatchPrompt(
    tech.name,
    tech.icon,
    input.category,
    input.description,
    batchCount,
    batchIndex,
    totalCount,
    existing
  );

  try {
    const { data, model } = await geminiGenerateJson<{ questions?: InterviewQuestionPayload[] }>({
      prompt,
      maxOutputTokens: 8192,
      temperature: 0.35,
      responseSchema: INTERVIEW_JSON_SCHEMA,
    });

    const questions = normalizeQuestions(data.questions || []);
    if (questions.length > 0) {
      return { questions: questions.slice(0, batchCount), model };
    }
  } catch (jsonErr) {
    console.warn('[Interview AI] JSON mode failed, fallback to text parse:', jsonErr);
  }

  const { text, model } = await geminiGenerateText({
    prompt: `${prompt}\n\nCHỈ JSON hợp lệ, không markdown.`,
    maxOutputTokens: 8192,
    temperature: 0.35,
    allowContinuation: false,
  });

  try {
    const parsed = parseAiJson<{ questions?: InterviewQuestionPayload[] }>(text);
    const questions = normalizeQuestions(parsed.questions || []);
    if (questions.length > 0) {
      return { questions: questions.slice(0, batchCount), model };
    }
  } catch {
    const salvaged = normalizeQuestions(salvageQuestionObjects(text) as InterviewQuestionPayload[]);
    if (salvaged.length > 0) {
      return { questions: salvaged.slice(0, batchCount), model };
    }
  }

  throw new Error(`AI không sinh được câu hỏi ở lô ${batchIndex + 1}`);
}

export async function generateInterviewQuestionsWithAI(
  input: GenerateInterviewInput
): Promise<{ questions: InterviewQuestionPayload[]; model: string }> {
  const tech = TECHNOLOGIES.find((t) => t.id === input.technologyId);
  if (!tech) {
    throw new Error('Công nghệ không hợp lệ');
  }

  const totalCount = Math.min(Math.max(input.questionCount, INTERVIEW_QUESTION_MIN), INTERVIEW_QUESTION_MAX);
  const allQuestions: InterviewQuestionPayload[] = [];
  let lastModel = '';

  const batchCount = Math.ceil(totalCount / BATCH_SIZE);

  for (let i = 0; i < batchCount; i++) {
    const remaining = totalCount - allQuestions.length;
    const thisBatch = Math.min(BATCH_SIZE, remaining);

    const { questions, model } = await generateBatch(
      input,
      tech,
      thisBatch,
      i,
      totalCount,
      allQuestions
    );

    for (const q of questions) {
      const dup = allQuestions.some(
        (e) => e.question.toLowerCase() === q.question.toLowerCase()
      );
      if (!dup) allQuestions.push(q);
    }

    lastModel = model;
    if (allQuestions.length >= totalCount) break;
  }

  if (allQuestions.length === 0) {
    throw new Error('AI không sinh được câu hỏi nào');
  }

  return {
    questions: allQuestions.slice(0, totalCount),
    model: lastModel,
  };
}

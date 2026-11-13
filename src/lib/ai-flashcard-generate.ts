import { geminiGenerateJson, geminiGenerateText } from '@/lib/ai-gemini';
import { parseAiJson } from './ai-json-parse';
import type { CuratedDictionaryWord } from './dictionary-query';

export type FlashcardPayload = {
  word: string;
  meaning_vi: string;
  ipa: string;
  example_en: string;
  fill_blank: string;
  fill_answer: string;
  image_prompt: string;
};

export type GenerateFlashcardsInput = {
  topic: string;
  description?: string;
  toeicLevel: 'beginner' | 'intermediate' | 'advanced';
  wordCount: number;
  dbWords?: CuratedDictionaryWord[];
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: '500–650',
  intermediate: '650–800',
  advanced: '800+',
};

const FLASHCARD_JSON_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          meaning_vi: { type: 'string' },
          ipa: { type: 'string' },
          example_en: { type: 'string' },
          fill_blank: { type: 'string' },
          fill_answer: { type: 'string' },
          image_prompt: { type: 'string' },
        },
        required: ['word', 'meaning_vi', 'example_en', 'fill_blank', 'fill_answer'],
      },
    },
  },
  required: ['cards'],
};

function normalizeCards(raw: FlashcardPayload[]): FlashcardPayload[] {
  return (raw || [])
    .filter((c) => c && c.word && String(c.word).trim())
    .map((c) => ({
      word: String(c.word).trim(),
      meaning_vi: String(c.meaning_vi || '').trim(),
      ipa: String(c.ipa || '').trim(),
      example_en: String(c.example_en || '').trim(),
      fill_blank: String(c.fill_blank || '').trim(),
      fill_answer: String(c.fill_answer || c.word || '').trim(),
      image_prompt: String(c.image_prompt || '').trim(),
    }));
}

export async function generateFlashcardsWithAI(
  input: GenerateFlashcardsInput
): Promise<{ cards: FlashcardPayload[]; model: string; sourceCount?: number }> {
  const totalCount = Math.min(Math.max(input.wordCount, 5), 30);
  const dbCandidateList = input.dbWords || [];

  const dbSection =
    dbCandidateList.length > 0
      ? `\nKHO TỪ VỰNG GỐC TỪ SUPABASE DICTIONARY (${dbCandidateList.length} từ khả dụng):
${JSON.stringify(
  dbCandidateList.slice(0, 35).map((w) => ({
    word: w.word,
    pos: w.pos,
    ipa: w.ipa,
    def_vi: w.def_vi,
  }))
)}

QUY TẮC BẮT BUỘC:
1. ƯU TIÊN TUYỆT ĐỐI chọn lọc các từ trong kho Database ở trên đúng chủ đề "${input.topic}" và trình độ TOEIC ${input.toeicLevel}.
2. Giữ nguyên 'word', sử dụng đúng phiên âm 'ipa' và nghĩa 'def_vi' từ kho Database.
3. Nếu kho trên chưa đủ ${totalCount} từ, hãy bổ sung thêm các từ vựng TOEIC tiêu chuẩn khác thuộc chủ đề này để đủ chính xác ${totalCount} từ.`
      : '';

  const prompt = `Bạn là AI giáo viên TOEIC của NikaLearn. Hãy sinh đúng ${totalCount} thẻ flashcard chất lượng cao.

CHỦ ĐỀ: ${input.topic}
${input.description ? `MÔ TẢ: ${input.description}` : ''}
TRÌNH ĐỘ TOEIC: ${input.toeicLevel} (${LEVEL_LABEL[input.toeicLevel] || '500-800'})
${dbSection}

Yêu cầu mỗi thẻ trong mảng "cards":
- word: từ vựng tiếng Anh
- meaning_vi: nghĩa tiếng Việt súc tích, chính xác
- ipa: phiên âm quốc tế chuẩn
- example_en: câu ví dụ ngữ cảnh chuẩn bài thi TOEIC
- fill_blank: câu ví dụ ẩn từ vựng đi bằng "____"
- fill_answer: từ vựng chính xác cần điền
- image_prompt: prompt tiếng Anh ngắn để vẽ ảnh minh họa

Trả về duy nhất JSON: {"cards":[...]}`;

  let finalCards: FlashcardPayload[] = [];
  let usedModel = 'gemini-3.1-flash-lite';

  try {
    // Single high-speed generation call
    const { data, model } = await geminiGenerateJson<{ cards?: FlashcardPayload[] }>({
      prompt,
      maxOutputTokens: 8192,
      temperature: 0.3,
      responseSchema: FLASHCARD_JSON_SCHEMA,
    });

    usedModel = model;
    finalCards = normalizeCards(data?.cards || []);
  } catch (error) {
    console.warn('[Flashcard Generate] JSON mode fallback to text parsing:', error);
    try {
      const { text, model } = await geminiGenerateText({
        prompt: `${prompt}\nCHỈ TRẢ VỀ JSON HỢP LỆ VỚI KHÓA "cards". KHÔNG CÓ TEXT THỪA.`,
        maxOutputTokens: 8192,
        temperature: 0.3,
        allowContinuation: false,
      });
      usedModel = model;
      const parsed = parseAiJson<{ cards?: FlashcardPayload[] }>(text);
      finalCards = normalizeCards(parsed?.cards || []);
    } catch (innerErr) {
      console.error('[Flashcard Generate] Text fallback failed:', innerErr);
    }
  }

  // Deduplicate by word
  const uniqueMap = new Map<string, FlashcardPayload>();
  for (const c of finalCards) {
    const key = c.word.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }
  const resultList = Array.from(uniqueMap.values()).slice(0, totalCount);

  if (resultList.length === 0) {
    throw new Error('AI không sinh được thẻ từ vựng nào. Vui lòng thử lại.');
  }

  return {
    cards: resultList,
    model: usedModel,
    sourceCount: dbCandidateList.length,
  };
}

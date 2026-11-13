import { supabaseAdmin } from '@/lib/supabase';
import { geminiGenerateText, geminiKeyErrorResponse, getGeminiApiKey } from '@/lib/ai-gemini';
import { DICTIONARY_SYSTEM_PROMPT } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface DictionaryEntry {
  id: number | string;
  word: string;
  pos: string | null;
  uk_pron: string | null;
  us_pron: string | null;
  definitions: any;
  audio_url?: string | null;
}

/**
 * STEP 1: ZERO-COST BOUNCER
 * Fast regex check to intercept casual/off-topic questions at 0 cost (0 token, 0 DB call).
 */
export function checkZeroCostBouncer(userMessage: string): string | null {
  const trimmed = userMessage.trim();

  // If question explicitly mentions TOEIC or English study terms, don't bounce
  const hasLearningIntent =
    /(?:toeic|part\s*[1-7]|grammar|ngữ\s*pháp|từ\s*vựng|nghĩa\s*là\s*gì|nghĩa\s*gì|dùng\s*sao|dùng\s*thế\s*nào|cách\s*dùng|ví\s*dụ|phát\s*âm|phiên\s*âm|dịch|listening|reading|collocation|synonym|antonym|paraphrase|test\s*\d*|đề\s*thi|câu\s*hỏi|đáp\s*án)/i.test(
      trimmed
    );

  // If message has pure English vocabulary query (e.g. single English word), let it pass to dictionary lookup
  if (/^[a-zA-Z\s\-']{1,35}$/.test(trimmed)) {
    return null;
  }

  // 1. Eating / meals / casual chitchat
  const eatPattern =
    /^(?:anh|em|bạn|ad|bot|ai|mình)?\s*(?:đã\s+)?(?:ăn\s+(?:cơm|trưa|tối|sáng|gì)?\s*chưa|đang\s+ăn\s+gì|uống\s+(?:nước|cà\s*phê|trà\s*sữa)\s*chưa|đói\s*chưa|no\s*chưa)[?!. ]*$/i;
  if (eatPattern.test(trimmed) && !hasLearningIntent) {
    return 'Mình nạp năng lượng bằng dữ liệu từ vựng TOEIC nên lúc nào cũng no căng! Nhân tiện, "ăn trưa nhanh" ở công sở hay dùng cụm **grab a bite** đấy; giờ bạn cần tra từ hay giải câu TOEIC nào thì gửi mình nhé!';
  }

  // 2. Appearance / flattery / compliments
  const appearancePattern =
    /^(?:anh|em|bạn|tôi|mình)?\s*(?:có\s+)?(?:đẹp\s+trai|xinh\s+gái|dễ\s+thương|cute|xấu|thông\s+minh|body\s+chuẩn)(?:\s+không|\s+k|\s+chứ|\s+nhỉ|\?|\s+quá)*$/i;
  if (appearancePattern.test(trimmed) && !hasLearningIntent) {
    return 'Tinh thần chăm chỉ cày đề của bạn chắc chắn là **outstanding** (nổi bật) và **attractive** (cuốn hút) rồi! Quay lại bài học nào, bạn đang thắc mắc từ vựng hay câu hỏi số mấy thế?';
  }

  // 3. Name / Age / Location
  const identityPattern =
    /^(?:anh|em|bạn|bot|ad)?\s*(?:tên\s+(?:là\s+)?gì|mấy\s+tuổi|bao\s+nhiêu\s+tuổi|sinh\s+năm\s+bao\s+nhiêu|quê\s+ở\s+đâu|ở\s+đâu|sống\s+ở\s+đâu|đến\s+từ\s+đâu|nhà\s+ở\s+đâu)(?:\s+vậy|\s+thế|\?)*$/i;
  if (identityPattern.test(trimmed) && !hasLearningIntent) {
    return "Mình là Gia sư AI TOEIC của NikaLearn, luôn túc trực 24/7 trên 'đám mây' để hỗ trợ bạn luyện thi! Bạn đang muốn luyện Part mấy hay tra từ vựng nào thế?";
  }

  // 4. Dating / Relationship
  const lovePattern =
    /^(?:anh|em|bạn|bot)?\s*(?:có\s+(?:người\s+yêu|bạn\s+gái|bạn\s+trai|crush|chồng|vợ)|yêu\s+(?:ai|tôi|em|anh|mình)|làm\s+người\s+yêu\s+(?:anh|em|mình)\s+nhé)(?:\s+chưa|\s+không|\s+nhé|\?)*$/i;
  if (lovePattern.test(trimmed) && !hasLearningIntent) {
    return 'Trái tim mình chỉ rung động trước các chủ điểm ngữ pháp TOEIC và niềm vui khi học viên tiến bộ thôi! Hãy để mình hỗ trợ bạn nâng band điểm tiếng Anh nhé, bạn đang cần hỗ trợ từ vựng hay dạng bài nào?';
  }

  // 5. Weather
  const weatherPattern =
    /^(?:thời\s+tiết\s+(?:hôm\s+nay|thế\s+nào)|trời\s+(?:mưa|nắng|lạnh|nóng))(?:\s+không|\s+vậy|\?)*$/i;
  if (weatherPattern.test(trimmed) && !hasLearningIntent) {
    return "Thời tiết hôm nay dù thế nào thì tinh thần luyện thi TOEIC vẫn luôn rực rỡ! Trong công sở, khi 'bận rộn ngập đầu' người ta hay dùng cụm **snowed under with work**. Bạn có từ vựng hay câu hỏi nào cần giải đáp không?";
  }

  // 6. Generic greetings without question
  const greetingPattern =
    /^(?:chào|xin\s+chào|hello|hi|hé\s+lô|hế\s+lô|alo|chào\s+ad|chào\s+bot|chào\s+bạn)[!?. ]*$/i;
  if (greetingPattern.test(trimmed) && !hasLearningIntent) {
    return 'Xin chào! Mình là Gia sư AI TOEIC của NikaLearn. Bạn có thể tra cứu từ vựng, hỏi ngữ pháp, mẹo giải đề Part 1 - 7 hoặc gửi câu hỏi bạn đang làm để cùng giải nhé!';
  }

  // 7. Coding / Math / Off-topic
  const offTopicPattern =
    /(?:viết\s+code|giải\s+toán|chứng\s+minh\s+bất\s+đẳng\s+thức|lập\s+trình\s+(?:python|javascript|java|c\+\+|c#|php)|tạo\s+website|tư\s+vấn\s+y\s+tế)/i;
  if (offTopicPattern.test(trimmed) && !hasLearningIntent) {
    return 'Chủ đề này nằm ngoài chuyên môn của mình rồi, mình chỉ chuyên trị **Tiếng Anh và luyện thi TOEIC** thôi! Bạn có từ vựng hay câu ngữ pháp nào đang làm khó bạn không?';
  }

  return null;
}

/**
 * Extract target English word/phrase from user message
 */
export function extractTargetWord(message: string, explicitWord?: string): string | null {
  if (explicitWord && explicitWord.trim().length > 0) {
    return explicitWord.trim();
  }

  const trimmed = message.trim();

  // Case 1: Entire message is a single English word/short phrase (1 - 35 chars)
  if (/^[a-zA-Z\s\-']{1,35}$/.test(trimmed)) {
    return trimmed;
  }

  // Case 2: Quoted word e.g. "accommodate", 'contract'
  const quoteMatch = trimmed.match(/["'‘“]([a-zA-Z\s\-']{2,30})["'’”]/);
  if (quoteMatch) {
    return quoteMatch[1].trim();
  }

  // Case 3: Split by whitespace & punctuation to avoid unicode regex boundaries issue
  const tokens = trimmed.replace(/[.,?!:;()\[\]{}]/g, ' ').split(/\s+/).filter(Boolean);

  // Look for token immediately after 'từ', 'chữ', 'cụm từ', 'tra từ'
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i].toLowerCase();
    if (t === 'từ' || t === 'tu' || t === 'chữ' || t === 'chu' || t === 'cụm') {
      const next = tokens[i + 1].replace(/["'‘“”]/g, '');
      if (/^[a-zA-Z\-']{2,30}$/.test(next)) {
        return next;
      }
    }
  }

  // Look for token immediately before 'dùng', 'nghĩa', 'là gì'
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i].replace(/["'‘“”]/g, '');
    const next = tokens[i + 1].toLowerCase();
    if (
      /^[a-zA-Z\-']{2,30}$/.test(cur) &&
      (next.startsWith('dùng') || next.startsWith('dung') || next.startsWith('nghĩa') || next === 'là')
    ) {
      return cur;
    }
  }

  // Case 4: Isolate single distinct English word
  const viStopwords = new Set([
    'tu', 'dung', 'nhu', 'the', 'nao', 'la', 'gi', 'sao', 'co', 'khong',
    'cua', 'trong', 'va', 'cho', 'voi', 'mot', 'cac', 'nhung', 've', 'khi',
    'de', 'ai', 'em', 'anh', 'ban', 'minh', 'toi', 'toeic', 'part', 'test', 'exam'
  ]);
  const pureEnglish = tokens.filter(
    (t) => /^[a-zA-Z\-']{3,25}$/.test(t) && !viStopwords.has(t.toLowerCase())
  );
  if (pureEnglish.length === 1) {
    return pureEnglish[0];
  }

  return null;
}

/**
 * STEP 2 & 3: Smart Supabase Query & Compact Packaging
 */
export async function queryDictionaryContext(targetWord: string | null): Promise<{
  contextXml: string;
  matchedWordData: DictionaryEntry | null;
}> {
  if (!targetWord || !supabaseAdmin) {
    return {
      contextXml: '<dictionary_context>EMPTY</dictionary_context>',
      matchedWordData: null,
    };
  }

  try {
    const cleanWord = targetWord.trim().toLowerCase();

    // Query exact or close matches, limited to 3 rows
    let { data: entries } = await supabaseAdmin
      .from('dictionary')
      .select('id, word, pos, uk_pron, us_pron, definitions')
      .ilike('word', cleanWord)
      .limit(3);

    // If no exact match and word ends with s/ed/ing, try stem
    if ((!entries || entries.length === 0) && cleanWord.length > 4) {
      const stem = cleanWord.replace(/(?:ing|ed|es|s)$/i, '');
      if (stem.length >= 3) {
        const { data: stemEntries } = await supabaseAdmin
          .from('dictionary')
          .select('id, word, pos, uk_pron, us_pron, definitions')
          .ilike('word', stem)
          .limit(2);
        if (stemEntries && stemEntries.length > 0) {
          entries = stemEntries;
        }
      }
    }

    if (!entries || entries.length === 0) {
      return {
        contextXml: '<dictionary_context>EMPTY</dictionary_context>',
        matchedWordData: null,
      };
    }

    const first = entries[0];
    const matchedWordData: DictionaryEntry = {
      id: first.id,
      word: first.word,
      pos: first.pos,
      uk_pron: first.uk_pron,
      us_pron: first.us_pron,
      definitions: first.definitions,
      // Public high-quality dictionary pronunciation audio URL
      audio_url: `https://api.dictionaryapi.dev/media/pronunciations/en/${encodeURIComponent(
        first.word.toLowerCase()
      )}-us.mp3`,
    };

    // Compact JSON packaging for token savings
    const compactList = entries.map((e) => ({
      word: e.word,
      pos: e.pos,
      uk_pron: e.uk_pron,
      us_pron: e.us_pron,
      definitions: Array.isArray(e.definitions)
        ? e.definitions.slice(0, 3).map((d: any) => ({
          en: d.def_en || '',
          vi: d.def_vi || '',
          example: d.examples?.[0]?.en || '',
        }))
        : e.definitions,
    }));

    return {
      contextXml: `<dictionary_context>${JSON.stringify(compactList)}</dictionary_context>`,
      matchedWordData,
    };
  } catch (err) {
    console.warn('[Dictionary Query Warning]:', err);
    return {
      contextXml: '<dictionary_context>EMPTY</dictionary_context>',
      matchedWordData: null,
    };
  }
}

/**
 * Handle AI Tutor & Dictionary chat request with 3-step Cost-Saving Pipeline
 */
export async function handleAiTutorChat(body: {
  message?: string;
  targetWord?: string;
  history?: ChatHistoryItem[];
}) {
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const history: ChatHistoryItem[] = Array.isArray(body.history) ? body.history : [];
  const explicitWord = typeof body.targetWord === 'string' ? body.targetWord.trim() : undefined;

  if (!message && !explicitWord) {
    return NextResponse.json({ error: 'Message or targetWord is required' }, { status: 400 });
  }

  const effectiveMessage = message || `Giải thích từ "${explicitWord}"`;

  // STEP 1: Zero-Cost Bouncer
  const bouncerReply = checkZeroCostBouncer(effectiveMessage);
  if (bouncerReply) {
    return NextResponse.json({
      success: true,
      reply: bouncerReply,
      model: 'zero-cost-bouncer',
      ragUsed: false,
      bouncerHit: true,
      matchedWordData: null,
    });
  }

  // STEP 2: Conditional DB Lookup
  const detectedTargetWord = extractTargetWord(effectiveMessage, explicitWord);
  const { contextXml, matchedWordData } = await queryDictionaryContext(detectedTargetWord);

  // STEP 3: Check API Key & Call LLM with DICTIONARY_SYSTEM_PROMPT
  if (!getGeminiApiKey()) {
    return geminiKeyErrorResponse();
  }

  const historyText = history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Học viên' : 'Gia sư AI'}: ${m.content}`)
    .join('\n');

  const userPrompt = `NGỮ CẢNH TỪ ĐIỂN:
${contextXml}

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${historyText || '(Không có)'}

CÂU HỎI CỦA HỌC VIÊN:
${effectiveMessage}`;

  const { text, model } = await geminiGenerateText({
    prompt: userPrompt,
    systemInstruction: DICTIONARY_SYSTEM_PROMPT,
    maxOutputTokens: 2500,
    temperature: 0.4,
    allowContinuation: true,
  });

  return NextResponse.json({
    success: true,
    reply: text,
    model,
    ragUsed: Boolean(matchedWordData),
    matchedWordData,
  });
}

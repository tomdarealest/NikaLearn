import { supabaseAdmin, supabase } from './supabase';
import { geminiGenerateText } from './ai-gemini';
import { parseAiJson } from './ai-json-parse';

export interface DictionaryItem {
  id: number;
  word: string;
  pos?: string;
  uk_pron?: string;
  us_pron?: string;
  definitions?: any;
}

export interface CuratedDictionaryWord {
  word: string;
  pos: string;
  ipa: string;
  def_vi: string;
  def_en: string;
}

export function formatDictionaryRecord(item: DictionaryItem): CuratedDictionaryWord {
  let def_vi = '';
  let def_en = '';

  if (Array.isArray(item.definitions) && item.definitions.length > 0) {
    const firstDef = item.definitions[0];
    if (typeof firstDef === 'object' && firstDef !== null) {
      def_vi = firstDef.def_vi || firstDef.vi || '';
      def_en = firstDef.def_en || firstDef.en || '';
    } else if (typeof firstDef === 'string') {
      def_en = firstDef;
    }
  } else if (typeof item.definitions === 'object' && item.definitions !== null) {
    def_vi = item.definitions.def_vi || item.definitions.vi || '';
    def_en = item.definitions.def_en || item.definitions.en || '';
  }

  const ipa = item.us_pron || item.uk_pron || '';

  return {
    word: item.word?.trim(),
    pos: item.pos || '',
    ipa,
    def_vi,
    def_en,
  };
}

// Preset roots with typo tolerance (e.g. 'busin' matches 'businees', 'business', 'bussines')
const PRESET_TOPIC_MAP: Array<{
  triggers: string[];
  seeds: string[];
}> = [
  {
    triggers: [
      'busin', 'bussin', 'kinh doanh', 'doanh nghiệp', 'thương mại', 'hợp đồng',
      'công ty', 'corporate', 'commercial', 'doanh nhân', 'tài chính'
    ],
    seeds: [
      'contract', 'negotiate', 'client', 'revenue', 'profit', 'investment', 'market',
      'strategy', 'partner', 'budget', 'meeting', 'proposal', 'agreement', 'sales',
      'manager', 'executive', 'corporation', 'finance', 'deal', 'expand', 'commercial',
      'transaction', 'enterprise', 'invoice', 'dividend', 'shareholder'
    ],
  },
  {
    triggers: [
      'airport', 'airp', 'sân bay', 'hàng không', 'máy bay', 'chuyến bay', 'flight', 'aviation'
    ],
    seeds: [
      'airport', 'flight', 'airplane', 'airline', 'plane', 'passenger', 'boarding',
      'boarding pass', 'luggage', 'baggage', 'terminal', 'gate', 'ticket', 'departure',
      'arrival', 'customs', 'security', 'pilot', 'crew', 'delay', 'carousel', 'transit',
      'carry-on', 'seatbelt', 'passport', 'runway', 'check-in', 'destination', 'schedule',
      'cabin', 'cockpit', 'takeoff', 'landing', 'attendant'
    ],
  },
  {
    triggers: ['offic', 'văn phòng', 'công sở', 'đồng nghiệp', 'họp', 'workplace'],
    seeds: [
      'colleague', 'department', 'equipment', 'document', 'deadline', 'agenda', 'schedule',
      'printer', 'supplies', 'presentation', 'conference', 'supervisor', 'stationery', 'memo',
      'report', 'manager', 'cubicle', 'project', 'assistant'
    ],
  },
  {
    triggers: ['travel', 'trav', 'du lịch', 'khách sạn', 'tour', 'kỳ nghỉ', 'hotel', 'resort'],
    seeds: [
      'hotel', 'reservation', 'tourist', 'journey', 'itinerary', 'destination', 'guide',
      'accommodation', 'explore', 'vacation', 'luggage', 'transport', 'booking', 'voyage',
      'sightseeing', 'reception', 'guest', 'brochure'
    ],
  },
  {
    triggers: ['shop', 'mua sắm', 'cửa hàng', 'siêu thị', 'giảm giá', 'retail', 'store'],
    seeds: [
      'discount', 'receipt', 'customer', 'cashier', 'refund', 'warranty', 'purchase',
      'bargain', 'retail', 'wholesale', 'cart', 'checkout', 'exchange', 'price',
      'inventory', 'sale', 'coupon', 'vendor'
    ],
  },
  {
    triggers: ['restau', 'nhà hàng', 'ẩm thực', 'ăn uống', 'đầu bếp', 'món ăn', 'food', 'dining'],
    seeds: [
      'menu', 'reservation', 'chef', 'waiter', 'waitress', 'bill', 'receipt', 'beverage',
      'dessert', 'appetizer', 'specialty', 'flavor', 'ingredient', 'order', 'dine', 'buffet'
    ],
  },
  {
    triggers: ['interv', 'phỏng vấn', 'tuyển dụng', 'xin việc', 'recruitment', 'career'],
    seeds: [
      'resume', 'candidate', 'qualification', 'experience', 'salary', 'position', 'hire',
      'applicant', 'interview', 'strength', 'weakness', 'skills', 'reference', 'portfolio'
    ],
  },
];

/**
 * Expand a topic into English keyword seeds to query the database dictionary
 */
async function getTopicKeywordSeeds(topic: string, description?: string): Promise<string[]> {
  const combined = `${topic} ${description || ''}`.trim().toLowerCase();

  // 1. Instant check matching presets with typo-tolerant triggers (0ms)
  for (const preset of PRESET_TOPIC_MAP) {
    const hasTrigger = preset.triggers.some((trigger) => combined.includes(trigger));
    if (hasTrigger) {
      return preset.seeds;
    }
  }

  // 2. Extract alphanumeric English words from topic & description
  const directWords = combined
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  if (directWords.length >= 3) {
    return directWords;
  }

  // 3. Fallback: Quick AI seed generation with robust text mode
  try {
    const prompt = `Topic: "${topic}". Description: "${description || ''}".
List 25 common English vocabulary words related to this topic for an English dictionary lookup.
Return JSON only: {"seeds": ["word1", "word2", ...]}`;

    const { text } = await geminiGenerateText({
      prompt,
      maxOutputTokens: 2048,
      temperature: 0.2,
      allowContinuation: false,
    });

    const parsed = parseAiJson<{ seeds?: string[] }>(text);
    if (parsed.seeds && parsed.seeds.length > 0) {
      return Array.from(new Set([...directWords, ...parsed.seeds.map((s) => s.trim().toLowerCase())]));
    }
  } catch (err) {
    console.warn('AI seed expansion fallback notice:', err);
  }

  return directWords.length > 0 ? directWords : [topic.toLowerCase().trim()];
}

/**
 * Search the Supabase `dictionary` table for words matching a given topic
 */
export async function queryDictionaryForTopic(
  topic: string,
  description?: string,
  targetCount: number = 20
): Promise<CuratedDictionaryWord[]> {
  const client = supabaseAdmin || supabase;
  if (!client) {
    console.warn('⚠️ Supabase client not initialized, skipping database dictionary query');
    return [];
  }

  try {
    const seeds = await getTopicKeywordSeeds(topic, description);
    const resultsMap = new Map<string, CuratedDictionaryWord>();

    // Parallel queries to Supabase for extreme speed
    const cleanTopic = topic.trim().toLowerCase().replace(/[^a-zA-Z]/g, '');

    const queryPromises = [
      // Batch exact seeds
      client
        .from('dictionary')
        .select('id, word, pos, uk_pron, us_pron, definitions')
        .in('word', seeds.slice(0, 45)),
    ];

    if (cleanTopic.length >= 3) {
      queryPromises.push(
        client
          .from('dictionary')
          .select('id, word, pos, uk_pron, us_pron, definitions')
          .ilike('word', `%${cleanTopic}%`)
          .limit(20)
      );
    }

    const responses = await Promise.all(queryPromises);

    for (const res of responses) {
      if (!res.error && Array.isArray(res.data)) {
        for (const row of res.data) {
          const formatted = formatDictionaryRecord(row);
          if (formatted.word) {
            resultsMap.set(formatted.word.toLowerCase(), formatted);
          }
        }
      }
    }

    const curatedList = Array.from(resultsMap.values());
    console.log(`[Dictionary] Found ${curatedList.length} matching words in Supabase dictionary for topic "${topic}"`);
    return curatedList;
  } catch (error) {
    console.error('Error querying Supabase dictionary:', error);
    return [];
  }
}

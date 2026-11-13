import { NextResponse } from 'next/server';
import { parseAiJson } from './ai-json-parse';

/**
 * Top active models officially recommended by Google AI Studio.
 * gemini-3.1-flash-lite is set as priority #1 (500 req/day, 15 RPM on free tier).
 */
const RECOMMENDED_ACTIVE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3-flash-preview',
  'gemini-3.8-pro',
  'gemini-pro-latest',
];

/**
 * Deprecated or restricted models that reject new API keys
 */
const DEPRECATED_PATTERNS = [
  '2.5-flash',
  '2.0-flash',
  '1.5-flash',
  '1.5-pro',
  '1.0-pro',
  'embedding',
  'imagen',
  'aqa',
  'tts',
];

const MAX_CONTINUATIONS = 2;

export type GeminiModelId = string;

// Cache discovered models from Google AI Studio
let liveModelsCache: string[] = [];
let lastFetchTime = 0;

/**
 * Query Google AI Studio API for the live list of models available to this API key,
 * automatically prioritizing gemini-3.1-flash-lite at #1 for high quota & speed.
 */
export async function getLiveSupportedModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (liveModelsCache.length > 0 && now - lastFetchTime < 300000) {
    return liveModelsCache;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, '')) as string[];

      // Filter out deprecated models that fail on new keys
      const validModels = rawList.filter((modelName) => {
        return !DEPRECATED_PATTERNS.some((pattern) => modelName.toLowerCase().includes(pattern));
      });

      // Sort: Recommended models first, then any other valid models from Google
      const ordered: string[] = [];

      for (const rec of RECOMMENDED_ACTIVE_MODELS) {
        if (validModels.includes(rec)) {
          ordered.push(rec);
        }
      }

      // Add remaining valid models discovered from Google
      for (const m of validModels) {
        if (!ordered.includes(m)) {
          ordered.push(m);
        }
      }

      // Ensure gemini-3.1-flash-lite is ALWAYS at position #1
      const finalList = [
        'gemini-3.1-flash-lite',
        ...ordered.filter((m) => m !== 'gemini-3.1-flash-lite'),
      ];

      console.log(`[Gemini] Discovered ${finalList.length} ready-to-use models (Priority #1: ${finalList[0]}):`, finalList.slice(0, 6));
      liveModelsCache = finalList;
      lastFetchTime = now;
      return finalList;
    }
  } catch (err) {
    console.warn('[Gemini] ListModels query failed, using static defaults:', err);
  }

  return [...RECOMMENDED_ACTIVE_MODELS];
}

/**
 * Supports single key or multiple keys separated by comma for auto-rotation
 */
export function getGeminiApiKeys(): string[] {
  const raw =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';

  const keys = raw
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter((k) => k && k !== 'your-gemini-api-key-here' && isValidGeminiKeyFormat(k));

  return keys;
}

export function getGeminiApiKey(): string | undefined {
  const keys = getGeminiApiKeys();
  return keys[0];
}

/** Accept both legacy (AIzaSy) and new auth keys (AQ.) from Google AI Studio */
export function isValidGeminiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith('AIza') || apiKey.startsWith('AQ.');
}

export function geminiKeyErrorResponse() {
  return NextResponse.json(
    {
      error: 'Gemini API key is not configured.',
      details:
        'Thêm GOOGLE_GENERATIVE_AI_API_KEY vào .env.local — tạo key tại https://aistudio.google.com/apikey',
    },
    { status: 500 }
  );
}

type GeminiGenerateOptions = {
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  allowContinuation?: boolean;
};

type GeminiJsonOptions = GeminiGenerateOptions & {
  responseSchema?: Record<string, unknown>;
};

type GeminiCallResult = {
  text: string;
  finishReason?: string;
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiModelOnce(
  model: string,
  apiKey: string,
  options: GeminiGenerateOptions & { responseMimeType?: string; responseSchema?: Record<string, unknown> }
): Promise<GeminiCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.3,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
  };

  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    generationConfig.responseSchema = options.responseSchema;
  }

  const requestBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: options.prompt }] }],
    generationConfig,
  };

  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error (${res.status})`;
    throw new Error(msg);
  }

  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();

  if (!text) {
    const reason = candidate?.finishReason || 'UNKNOWN';
    throw new Error(`Gemini returned empty response (finishReason: ${reason})`);
  }

  return { text, finishReason: candidate?.finishReason };
}

/**
 * Call Gemini REST API with dynamic live models and multi-key failover.
 * Never gives up early: tries every valid model across every key configured.
 */
export async function geminiGenerateText(
  options: GeminiGenerateOptions
): Promise<{ text: string; model: string }> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error('Gemini API key is not configured');
  }

  let lastError: Error | null = null;

  for (let k = 0; k < keys.length; k++) {
    const apiKey = keys[k];
    const models = await getLiveSupportedModels(apiKey);

    for (const model of models) {
      try {
        const { text } = await callGeminiModelOnce(model, apiKey, options);
        return { text, model };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown Gemini error');
        console.warn(`[Gemini Text] Key #${k + 1} - Model ${model} failed (${lastError.message}), trying next model...`);
        if (lastError.message.includes('high demand') || lastError.message.includes('spikes in demand')) {
          await sleep(500);
        }
        continue;
      }
    }
  }

  throw lastError ?? new Error('All Gemini models and keys exhausted');
}

/**
 * Gemini structured JSON output with automatic live model selection & multi-key rotation.
 */
export async function geminiGenerateJson<T = unknown>(
  options: GeminiJsonOptions
): Promise<{ text: string; model: string; data: T }> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error('Gemini API key is not configured');
  }

  let lastError: Error | null = null;

  for (let k = 0; k < keys.length; k++) {
    const apiKey = keys[k];
    const models = await getLiveSupportedModels(apiKey);

    for (const model of models) {
      try {
        const { text } = await callGeminiModelOnce(model, apiKey, {
          ...options,
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema,
        });

        const data = JSON.parse(text) as T;
        return { text, model, data };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown Gemini error');
        console.warn(`[Gemini JSON] Key #${k + 1} - Model ${model} failed (${lastError.message}), trying next model...`);
        if (lastError.message.includes('high demand') || lastError.message.includes('spikes in demand')) {
          await sleep(500);
        }
        continue;
      }
    }
  }

  // Fallback to text mode + robust JSON parsing
  try {
    const { text, model } = await geminiGenerateText({
      prompt: `${options.prompt}\n\nLƯU Ý: CHỈ TRẢ VỀ DUY NHẤT CHUỖI JSON HỢP LỆ. KHÔNG KÈM GIẢI THÍCH HAY DẤU BACKTICKS.`,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      temperature: 0.3,
      allowContinuation: false,
    });
    const parsed = parseAiJson<T>(text);
    return { text, model, data: parsed };
  } catch (fallbackErr) {
    console.error('[Gemini JSON fallback failed]:', fallbackErr);
    throw lastError ?? fallbackErr;
  }
}

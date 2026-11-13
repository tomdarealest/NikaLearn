/**
 * Parse JSON from Gemini responses — handles markdown fences,
 * unescaped control chars, trailing commas, and truncated JSON.
 */

function stripMarkdownFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

function extractJsonObject(text: string): string {
  const cleaned = stripMarkdownFence(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1) {
    throw new Error('AI không trả về JSON hợp lệ');
  }
  if (end === -1 || end <= start) {
    return cleaned.slice(start);
  }
  return cleaned.slice(start, end + 1);
}

/** Escape raw control chars inside JSON string literals (common in AI code answers). */
export function sanitizeJsonControlChars(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const code = char.charCodeAt(0);

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && code < 32) {
      if (char === '\n') result += '\\n';
      else if (char === '\r') result += '\\r';
      else if (char === '\t') result += '\\t';
      else result += ' ';
      continue;
    }

    result += char;
  }

  if (inString) result += '"';
  return result;
}

function removeTrailingCommas(json: string): string {
  return json.replace(/,\s*([}\]])/g, '$1');
}

/** Close unclosed brackets/braces after truncated AI output. */
function repairTruncatedJson(json: string): string {
  let s = sanitizeJsonControlChars(json.trim());

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}' || char === ']') {
      if (stack.length && stack[stack.length - 1] === char) stack.pop();
    }
  }

  s = removeTrailingCommas(s.replace(/,\s*$/, ''));

  while (stack.length) {
    s += stack.pop();
  }

  return s;
}

/** Salvage complete objects from a broken questions array. */
export function salvageQuestionObjects(text: string): Array<{
  level?: string;
  question?: string;
  answer?: string;
}> {
  const cleaned = sanitizeJsonControlChars(stripMarkdownFence(text));
  const results: Array<{ level?: string; question?: string; answer?: string }> = [];

  const objectPattern =
    /\{\s*"level"\s*:\s*"([^"]*)"\s*,\s*"question"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"answer"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g;

  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(cleaned)) !== null) {
    const unescape = (s: string) =>
      s.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    results.push({
      level: match[1],
      question: unescape(match[2]),
      answer: unescape(match[3]),
    });
  }

  return results;
}

export function parseAiJson<T>(text: string): T {
  const raw = extractJsonObject(text);
  const attempts = [
    raw,
    sanitizeJsonControlChars(raw),
    removeTrailingCommas(raw),
    removeTrailingCommas(sanitizeJsonControlChars(raw)),
    repairTruncatedJson(raw),
    removeTrailingCommas(repairTruncatedJson(raw)),
  ];

  let lastError: unknown;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'JSON không hợp lệ';
  throw new Error(message);
}

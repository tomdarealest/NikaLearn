import { NextRequest, NextResponse } from 'next/server';
import {
  geminiGenerateText,
  geminiKeyErrorResponse,
  getGeminiApiKey,
} from '@/lib/ai-gemini';

export async function POST(request: NextRequest) {
  try {
    if (!getGeminiApiKey()) return geminiKeyErrorResponse();

    const body = await request.json();
    const referenceText = typeof body.referenceText === 'string' ? body.referenceText.trim() : '';
    const userTranscript = typeof body.userTranscript === 'string' ? body.userTranscript.trim() : '';
    const phoneticHint = typeof body.phoneticHint === 'string' ? body.phoneticHint.trim() : '';

    if (!referenceText || !userTranscript) {
      return NextResponse.json(
        { error: 'referenceText and userTranscript are required' },
        { status: 400 }
      );
    }

    const { text, model } = await geminiGenerateText({
      maxOutputTokens: 500,
      temperature: 0.3,
      prompt: `Chấm phát âm TOEIC. Reference: "${referenceText}"${phoneticHint ? ` (${phoneticHint})` : ''}. User said: "${userTranscript}".

Trả JSON:
{"overallScore":0-100,"accuracy":0-100,"fluency":0-100,"prosody":0-100,"summary":"tiếng Việt","wordFeedback":[{"word":"","issue":"","tip":""}],"practiceTip":""}
Chỉ JSON.`,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, data: result, model });
  } catch (error) {
    console.error('Pronunciation Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to evaluate pronunciation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

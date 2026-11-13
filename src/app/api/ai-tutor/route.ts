import { NextRequest, NextResponse } from 'next/server';
import { handleAiTutorChat } from '@/lib/ai-tutor-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return await handleAiTutorChat(body);
  } catch (error) {
    console.error('AI Tutor API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process AI tutor request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { handleAiTutorChat } from '@/lib/ai-tutor-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleAiTutorChat(body);
  } catch (error) {
    console.error('TOEIC Chat Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

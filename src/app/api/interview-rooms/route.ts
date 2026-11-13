import { NextRequest, NextResponse } from 'next/server';
import { insert } from '@/lib/db';
import { getAuthPayloadFromRequest } from '@/lib/get-api-user';
import { generateInterviewRoomCode, generateModeratorKey } from '@/lib/interview-room';

function isMissingTableError(error: unknown) {
  const code = (error as { code?: string })?.code;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.toLowerCase().includes('does not exist') ||
    msg.toLowerCase().includes('could not find')
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthPayloadFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Đăng nhập để tạo phòng phỏng vấn' },
        { status: 401 }
      );
    }

    let code = generateInterviewRoomCode();
    const body = await request.json().catch(() => ({}));
    if (body?.code && typeof body.code === 'string') {
      const candidate = body.code.trim().toLowerCase();
      if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(candidate)) code = candidate;
    }

    const moderatorKey = generateModeratorKey();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const row = {
      id: crypto.randomUUID(),
      code,
      host_user_id: auth.userId,
      moderator_key: moderatorKey,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    await insert('interview_rooms', row);

    return NextResponse.json({
      success: true,
      data: {
        code,
        isHost: true,
        moderatorKey,
        expiresAt,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      const auth = getAuthPayloadFromRequest(request);
      if (!auth) {
        return NextResponse.json(
          { success: false, message: 'Đăng nhập để tạo phòng phỏng vấn' },
          { status: 401 }
        );
      }
      const code = generateInterviewRoomCode();
      const moderatorKey = generateModeratorKey();
      return NextResponse.json({
        success: true,
        data: { code, isHost: true, moderatorKey, clientOnly: true },
        message: 'Chạy interview-schema.sql để lưu host lâu dài. Tạm thời host trên thiết bị này.',
      });
    }
    console.error('POST interview room:', error);
    return NextResponse.json({ success: false, message: 'Không tạo được phòng' }, { status: 500 });
  }
}

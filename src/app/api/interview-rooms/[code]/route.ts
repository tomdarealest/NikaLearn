import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder } from '@/lib/db';
import { getAuthPayloadFromRequest } from '@/lib/get-api-user';
import { isValidRoomCode } from '@/lib/interview-room';

type RouteContext = { params: Promise<{ code: string }> };

type InterviewRoomRow = {
  code: string;
  host_user_id: string;
  moderator_key: string;
  expires_at: string | null;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode?.toLowerCase() ?? '';

    if (!isValidRoomCode(code)) {
      return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ' }, { status: 400 });
    }

    const room = await queryOneBuilder<InterviewRoomRow>('interview_rooms', {
      select: 'code, host_user_id, moderator_key, expires_at',
      filters: { code },
    });

    if (!room) {
      return NextResponse.json({
        success: true,
        data: { exists: false, isHost: false, code },
      });
    }

    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({
        success: true,
        data: { exists: false, isHost: false, code, expired: true },
      });
    }

    const auth = getAuthPayloadFromRequest(request);
    const isHost = Boolean(auth && auth.userId === room.host_user_id);

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        code,
        isHost,
        moderatorKey: isHost ? room.moderator_key : undefined,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('could not find')) {
      return NextResponse.json({
        success: true,
        data: { exists: false, isHost: false },
      });
    }
    console.error('GET interview room:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải phòng' }, { status: 500 });
  }
}

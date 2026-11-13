import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder } from '@/lib/db';
import { getAuthPayloadFromRequest } from '@/lib/get-api-user';
import { getJitsiRoomName, isValidRoomCode } from '@/lib/interview-room';
import { createJaasToken, getJaasConfig, getJaasRoomName } from '@/lib/jitsi-jaas';

type RouteContext = { params: Promise<{ code: string }> };

type InterviewRoomRow = {
  host_user_id: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode?.toLowerCase() ?? '';

    if (!isValidRoomCode(code)) {
      return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ' }, { status: 400 });
    }

    const auth = getAuthPayloadFromRequest(request);
    const displayName = request.nextUrl.searchParams.get('name')?.trim() || 'Khách';
    const email = auth?.email || `${displayName.replace(/\s/g, '.').toLowerCase()}@nikalearn.local`;

    let isHost = false;

    const room = await queryOneBuilder<InterviewRoomRow>('interview_rooms', {
      select: 'host_user_id',
      filters: { code },
    }).catch(() => null);

    if (room && auth) {
      isHost = auth.userId === room.host_user_id;
    }

    const jaas = getJaasConfig();
    const jitsiRoom = getJitsiRoomName(code);

    if (jaas) {
      const token = createJaasToken({
        config: jaas,
        roomName: jitsiRoom,
        userName: displayName,
        userEmail: email,
        isModerator: isHost,
      });

      return NextResponse.json({
        success: true,
        data: {
          provider: 'jaas',
          domain: '8x8.vc',
          roomName: getJaasRoomName(jaas.appId, jitsiRoom),
          jwt: token,
          isHost,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        provider: 'jitsi',
        domain: 'meet.jit.si',
        roomName: jitsiRoom,
        jwt: null,
        isHost,
      },
    });
  } catch (error) {
    console.error('GET jitsi token:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tạo token phòng họp' }, { status: 500 });
  }
}

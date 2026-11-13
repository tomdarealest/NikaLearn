'use client';

import { useEffect, useRef } from 'react';
import { getJitsiRoomName } from '@/lib/interview-room';

type JitsiApi = {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

export type JitsiMeetConfig = {
  domain: string;
  roomName: string;
  jwt: string | null;
  isHost: boolean;
};

type Props = {
  roomCode: string;
  displayName: string;
  isHost: boolean;
  meetConfig: JitsiMeetConfig | null;
};

export default function InterviewJitsiMeet({ roomCode, displayName, isHost, meetConfig }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);

  useEffect(() => {
    const parentNode = containerRef.current;
    if (!parentNode || !meetConfig) return;

    let disposed = false;

    const setupApi = () => {
      if (disposed || !window.JitsiMeetExternalAPI || !containerRef.current) return;

      const domain = meetConfig.domain;
      const roomName = meetConfig.jwt
        ? meetConfig.roomName
        : getJitsiRoomName(roomCode);

      const hostMode = isHost || meetConfig.isHost;
      const useJaas = Boolean(meetConfig.jwt);

      // meet.jit.si công cộng không hỗ trợ moderator qua API — chỉ JaaS JWT mới có quyền host thật
      const configOverwrite = useJaas
        ? {
            prejoinPageEnabled: !hostMode,
            prejoinConfig: { enabled: !hostMode },
            enableLobby: !hostMode,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: false,
            enableWelcomePage: false,
            requireDisplayName: false,
          }
        : {
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            enableLobby: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: false,
            enableWelcomePage: false,
            requireDisplayName: false,
          };

      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        lang: 'vi',
        jwt: meetConfig.jwt || undefined,
        userInfo: { displayName },
        configOverwrite,
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: false,
        },
      });

      apiRef.current = api;

      if (useJaas && hostMode) {
        const grantHostControls = () => {
          try {
            api.executeCommand('toggleLobby', false);
          } catch {
            /* ignore */
          }
        };
        api.addEventListener('videoConferenceJoined', grantHostControls);
        api.addEventListener('participantRoleChanged', (event: unknown) => {
          const role = (event as { role?: string })?.role;
          if (role !== 'moderator') grantHostControls();
        });
      }
    };

    if (window.JitsiMeetExternalAPI) {
      setupApi();
    } else {
      const existing = document.querySelector('script[data-jitsi-api]');
      const onReady = () => setupApi();
      if (existing) {
        existing.addEventListener('load', onReady);
      } else {
        const script = document.createElement('script');
        script.src = `https://${meetConfig.domain}/external_api.js`;
        script.async = true;
        script.dataset.jitsiApi = 'true';
        script.onload = onReady;
        document.body.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [roomCode, displayName, isHost, meetConfig]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}

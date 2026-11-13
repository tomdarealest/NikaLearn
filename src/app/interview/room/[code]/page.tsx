'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, Users, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import InterviewJitsiMeet, { type JitsiMeetConfig } from '@/components/interview/InterviewJitsiMeet';
import {
  getRoomShareUrl,
  isValidRoomCode,
  isLocalHostRoom,
} from '@/lib/interview-room';

type RoomSession = {
  isHost: boolean;
  moderatorKey?: string;
  loading: boolean;
};

export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const code = (params.code as string)?.toLowerCase() ?? '';
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<RoomSession>({ isHost: false, loading: true });
  const [meetConfig, setMeetConfig] = useState<JitsiMeetConfig | null>(null);
  const valid = isValidRoomCode(code);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!valid) return;

    let cancelled = false;

    const loadSession = async () => {
      try {
        const res = await fetch(`/api/interview-rooms/${code}`, { credentials: 'include' });
        const data = await res.json();

        if (cancelled) return;

        if (data.success && data.data?.isHost) {
          const modKey =
            data.data.moderatorKey ||
            (typeof window !== 'undefined' ? sessionStorage.getItem(`interview-mod-${code}`) : null) ||
            undefined;
          setSession({ isHost: true, moderatorKey: modKey || undefined, loading: false });
          return;
        }

        const localHost = isLocalHostRoom(code);
        const localMod =
          typeof window !== 'undefined' ? sessionStorage.getItem(`interview-mod-${code}`) : null;

        if (localHost && localMod) {
          setSession({ isHost: true, moderatorKey: localMod, loading: false });
        } else {
          setSession({ isHost: false, loading: false });
        }
      } catch {
        if (!cancelled) {
          const localHost = isLocalHostRoom(code);
          const localMod =
            typeof window !== 'undefined' ? sessionStorage.getItem(`interview-mod-${code}`) : null;
          setSession({
            isHost: localHost && Boolean(localMod),
            moderatorKey: localMod || undefined,
            loading: false,
          });
        }
      }
    };

    if (!authLoading) loadSession();

    return () => {
      cancelled = true;
    };
  }, [code, valid, authLoading]);

  const displayName = user?.full_name || user?.username || 'Khách';

  useEffect(() => {
    if (!valid || session.loading) return;

    let cancelled = false;

    const loadMeetConfig = async () => {
      try {
        const params = new URLSearchParams({ name: displayName });
        const res = await fetch(`/api/interview-rooms/${code}/jitsi-token?${params}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setMeetConfig({
            domain: data.data.domain,
            roomName: data.data.roomName,
            jwt: data.data.jwt,
            isHost: session.isHost || data.data.isHost,
          });
        }
      } catch {
        if (!cancelled) {
          setMeetConfig({
            domain: 'meet.jit.si',
            roomName: `nikalearn-interview-${code}`,
            jwt: null,
            isHost: session.isHost,
          });
        }
      }
    };

    loadMeetConfig();
    return () => {
      cancelled = true;
    };
  }, [code, valid, session.loading, session.isHost, displayName]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getRoomShareUrl(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const displayNameForHeader = displayName;

  if (!valid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-medium text-foreground mb-2">Mã phòng không hợp lệ</p>
        <p className="text-sm text-muted-foreground mb-6">Định dạng: abc-defg-hijk</p>
        <button
          type="button"
          onClick={() => router.push('/interview')}
          className="px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium"
        >
          Quay lại Phỏng vấn
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <header className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-900/95 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/interview')}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Rời phòng"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate flex items-center gap-2">
              Phòng phỏng vấn NikaLearn
              {session.isHost && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                  <Shield className="w-3 h-3" />
                  Host
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 font-mono">{code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Đã copy' : 'Chia sẻ'}
          </button>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            Live
          </span>
        </div>
      </header>

      <div className="flex-1 min-h-0 relative">
        {session.loading || !meetConfig ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Đang chuẩn bị phòng...
          </div>
        ) : (
          <InterviewJitsiMeet
            roomCode={code}
            displayName={displayNameForHeader}
            isHost={session.isHost}
            meetConfig={meetConfig}
          />
        )}
      </div>
    </div>
  );
}

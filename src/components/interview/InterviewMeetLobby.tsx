'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Keyboard, X, Copy, Check, Link2, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  generateInterviewRoomCode,
  getRoomPath,
  getRoomShareUrl,
  normalizeRoomCode,
  markLocalHostRoom,
} from '@/lib/interview-room';

type Props = {
  open: boolean;
  onClose: () => void;
};

const TIPS = [
  {
    title: 'Nhận mã phòng bạn có thể chia sẻ',
    desc: 'Gửi mã cho ứng viên hoặc người phỏng vấn để cùng vào phòng.',
  },
  {
    title: 'Phỏng vấn trực tuyến an toàn',
    desc: 'Phòng họp riêng, chỉ người có mã mới tham gia được.',
  },
  {
    title: 'Camera & micro sẵn sàng',
    desc: 'Kiểm tra thiết bị trước khi bắt đầu buổi phỏng vấn.',
  },
];

export default function InterviewMeetLobby({ open, onClose }: Props) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const resetAndClose = () => {
    setJoinInput('');
    setJoinError('');
    setCreatedCode(null);
    setCopied(null);
    onClose();
  };

  const handleJoin = () => {
    const code = normalizeRoomCode(joinInput);
    if (!code) {
      setJoinError('Mã không hợp lệ. Dùng định dạng abc-defg-hijk');
      return;
    }
    setJoinError('');
    router.push(getRoomPath(code));
  };

  const handleCreate = async () => {
    if (!isAuthenticated) {
      setJoinError('Vui lòng đăng nhập để tạo phòng — bạn sẽ là quản trị viên phòng.');
      return;
    }

    try {
      setCreating(true);
      setJoinError('');
      const code = generateInterviewRoomCode();

      const res = await fetch('/api/interview-rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không tạo được phòng');
      }

      const roomCode = data.data.code as string;
      markLocalHostRoom(roomCode);

      if (data.data.moderatorKey) {
        sessionStorage.setItem(`interview-mod-${roomCode}`, data.data.moderatorKey);
      }

      setCreatedCode(roomCode);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Không tạo được phòng');
    } finally {
      setCreating(false);
    }
  };

  const handleEnterRoom = () => {
    if (createdCode) {
      markLocalHostRoom(createdCode);
      router.push(getRoomPath(createdCode));
    }
  };

  const copyText = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      alert('Không copy được. Hãy copy thủ công.');
    }
  };

  const canJoin = normalizeRoomCode(joinInput) !== null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl min-w-[min(100%,320px)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meet-lobby-title"
      >
        <button
          type="button"
          onClick={resetAndClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 sm:px-12 lg:px-16 pt-10 sm:pt-12 pb-8 sm:pb-10 text-center">
          {!createdCode ? (
            <>
              <h2 id="meet-lobby-title" className="text-xl sm:text-2xl font-normal text-foreground mb-3 leading-snug">
                Tính năng phỏng vấn trực tuyến
                <br />
                dành cho lập trình viên
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
                Kết nối, phỏng vấn và đánh giá ứng viên mọi lúc mọi nơi với NikaLearn
              </p>

              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center gap-4 mb-6 max-w-2xl mx-auto">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || authLoading}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium text-sm sm:text-base shadow-sm transition-colors shrink-0 disabled:opacity-60"
                >
                  {creating ? <Loader className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
                  {creating ? 'Đang tạo...' : 'Cuộc họp mới'}
                </button>

                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex flex-1 items-center gap-3 px-4 sm:px-5 py-3 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-[#1a73e8]/30 focus-within:border-[#1a73e8]">
                    <Keyboard className="w-5 h-5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={joinInput}
                      onChange={(e) => {
                        setJoinInput(e.target.value);
                        setJoinError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && canJoin && handleJoin()}
                      placeholder="Nhập mã hoặc đường liên kết"
                      className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={!canJoin}
                    className="px-5 py-3 text-sm sm:text-base font-medium text-[#1a73e8] disabled:text-muted-foreground disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors shrink-0"
                  >
                    Tham gia
                  </button>
                </div>
              </div>

              {joinError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">{joinError}</p>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                <Link2 className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Phòng phỏng vấn đã sẵn sàng</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Chia sẻ mã hoặc đường liên kết bên dưới
              </p>
              {user && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-6">
                  Bạn ({user.full_name || user.username}) là quản trị viên phòng
                </p>
              )}

              <div className="flex items-center justify-center gap-2 mb-4 max-w-md mx-auto">
                <code className="text-2xl sm:text-3xl font-mono font-semibold tracking-widest text-foreground">
                  {createdCode}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(createdCode, 'code')}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                  title="Copy mã"
                >
                  {copied === 'code' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border mb-6 text-left max-w-xl mx-auto">
                <p className="flex-1 text-xs text-muted-foreground truncate font-mono">
                  {getRoomShareUrl(createdCode)}
                </p>
                <button
                  type="button"
                  onClick={() => copyText(getRoomShareUrl(createdCode), 'link')}
                  className="p-1.5 rounded hover:bg-muted shrink-0"
                  title="Copy link"
                >
                  {copied === 'link' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setCreatedCode(null)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleEnterRoom}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1765cc] text-white text-sm font-semibold"
                >
                  Vào phòng ngay
                </button>
              </div>
            </>
          )}

          {!createdCode && (
            <div className="pt-8 border-t border-border mt-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setTipIndex((i) => (i - 1 + TIPS.length) % TIPS.length)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Previous tip"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{TIPS[tipIndex].title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{TIPS[tipIndex].desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Next tip"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center gap-1.5 mt-3">
                {TIPS.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i === tipIndex ? 'bg-[#1a73e8]' : 'bg-muted-foreground/30'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

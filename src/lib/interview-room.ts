/** Room code helpers for interview video rooms (Jitsi-backed) */

const CODE_PATTERN = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

function randomSegment(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function generateInterviewRoomCode(): string {
  return `${randomSegment(3)}-${randomSegment(4)}-${randomSegment(3)}`;
}

export function generateModeratorKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const HOST_ROOM_STORAGE_KEY = 'nikalearn-interview-host-codes';

export function markLocalHostRoom(code: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(HOST_ROOM_STORAGE_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(code);
    sessionStorage.setItem(HOST_ROOM_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    sessionStorage.setItem(HOST_ROOM_STORAGE_KEY, JSON.stringify([code]));
  }
}

export function isLocalHostRoom(code: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(HOST_ROOM_STORAGE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(code);
  } catch {
    return false;
  }
}

export function normalizeRoomCode(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const fromPath = trimmed.match(/interview\/room\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  if (fromPath) return fromPath[1].toLowerCase();

  const fromQuery = trimmed.match(/[?&]code=([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  if (fromQuery) return fromQuery[1].toLowerCase();

  const cleaned = trimmed.replace(/\s/g, '');
  if (CODE_PATTERN.test(cleaned)) return cleaned;

  return null;
}

export function isValidRoomCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function getJitsiRoomName(code: string): string {
  return `nikalearn-interview-${code}`;
}

export function getRoomPath(code: string): string {
  return `/interview/room/${code}`;
}

export function getRoomShareUrl(code: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${getRoomPath(code)}`;
  }
  return getRoomPath(code);
}

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type DictionaryEntry = {
  id: number | string;
  word: string;
  pos: string | null;
  uk_pron: string | null;
  us_pron: string | null;
  definitions: any;
  audio_url?: string | null;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  matchedWordData?: DictionaryEntry | null;
  model?: string;
  bouncerHit?: boolean;
  timestamp?: number;
};

interface AiTutorContextType {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeTab: 'chat' | 'pronunciation';
  setActiveTab: (tab: 'chat' | 'pronunciation') => void;
  cachedExams: any[];
  setCachedExams: (exams: any[]) => void;
  clearChat: () => void;
}

const STORAGE_KEY = 'nikalearn_ai_tutor_session';
const TTL_24H = 24 * 60 * 60 * 1000;

const welcomeMessage: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content:
    'Xin chào! Tôi là Gia sư AI TOEIC của NikaLearn. Bạn có thể hỏi về ngữ pháp, từ vựng, chiến lược làm bài, hoặc yêu cầu giải thích câu hỏi trong ngân hàng đề thi.',
  timestamp: Date.now(),
};

const initialMessages: ChatMessage[] = [welcomeMessage];

function loadFromStorage(): ChatMessage[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { messages: ChatMessage[]; lastUpdated: number };
    if (Date.now() - parsed.lastUpdated > TTL_24H) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      return parsed.messages;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

function saveToStorage(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ messages, lastUpdated: Date.now() })
    );
  } catch { /* quota exceeded — ignore */ }
}

const AiTutorContext = createContext<AiTutorContextType | undefined>(undefined);

export function AiTutorProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'pronunciation'>('chat');
  const [cachedExams, setCachedExams] = useState<any[]>([]);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setMessages(stored);
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever messages change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveToStorage(messages);
    }
  }, [messages, hydrated]);

  const clearChat = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([
      { ...welcomeMessage, id: `welcome-${Date.now()}`, timestamp: Date.now() },
    ]);
  }, []);

  return (
    <AiTutorContext.Provider
      value={{
        messages,
        setMessages,
        activeTab,
        setActiveTab,
        cachedExams,
        setCachedExams,
        clearChat,
      }}
    >
      {children}
    </AiTutorContext.Provider>
  );
}

export function useAiTutor() {
  const ctx = useContext(AiTutorContext);
  if (!ctx) {
    throw new Error('useAiTutor must be used within AiTutorProvider');
  }
  return ctx;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Loader,
  Sparkles,
  Volume2,
  ChevronRight,
  AlertCircle,
  BookOpen,
  Zap,
  RotateCcw,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import PageContainer from '@/components/PageContainer';
import { PRONUNCIATION_SAMPLES } from '@/lib/ai-toeic-pronunciation-data';
import { useAiTutor, ChatMessage, DictionaryEntry } from '@/contexts/AiTutorContext';

type TabId = 'chat' | 'pronunciation';

type PronunciationResult = {
  overallScore: number;
  accuracy: number;
  fluency: number;
  prosody: number;
  summary: string;
  wordFeedback: Array<{ word: string; issue: string; tip: string }>;
  practiceTip: string;
};

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const SUGGESTED_PROMPTS = [
  'accommodate nghĩa là gì?',
  'Từ contract dùng như thế nào?',
  'Giải thích chiến lược làm Part 5',
  'Mẹo nghe Part 2 hiệu quả',
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const IDLE_TIMEOUT_30M = 30 * 60 * 1000;

function isIndependentLookup(text: string): boolean {
  const trimmed = text.trim();
  // 1. Standalone English word or short English phrase
  if (/^[a-zA-Z\s\-']{1,35}$/.test(trimmed)) {
    return true;
  }
  // 2. Contains quoted English word e.g. "accommodate" nghĩa là gì
  if (/["'‘“][a-zA-Z\s\-']{2,30}["'’”]/i.test(trimmed)) {
    return true;
  }
  // 3. Explicit vocabulary questions e.g. "Từ contract dùng như thế nào?", "accommodate nghĩa là gì"
  if (
    /(?:từ|cụm\s+từ|chữ|tra\s+từ|tìm\s+từ)\s+["'‘“]?[a-zA-Z\-']+/i.test(trimmed) ||
    /\b[a-zA-Z\-']{2,30}\b\s*(?:dùng\s+sao|dùng\s+như\s+thế\s+nào|nghĩa\s+là\s+gì|nghĩa\s+gì|là\s+gì)/i.test(trimmed)
  ) {
    return true;
  }
  return false;
}

export default function AiTutorPage() {
  const { activeTab, setActiveTab } = useAiTutor();

  return (
    <PageShell className="pb-16">
      <section className="page-hero bg-gradient-to-b from-emerald-50/50 dark:from-emerald-950/20 to-background">
        <PageContainer className="py-12 lg:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              AI TOEIC Module & Từ điển
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Gia sư AI & Từ điển TOEIC
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
              Tra cứu từ vựng chuẩn Cambridge/Oxford, phát âm IPA, giải thích ngữ pháp và phân tích câu hỏi đề thi TOEIC thông minh.
            </p>
          </div>
        </PageContainer>
      </section>

      <PageContainer className="py-8">
        <div className="rounded-2xl surface-panel shadow-sm overflow-hidden">
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === 'chat'
                  ? 'text-emerald-600 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
              }`}
            >
              <Bot className="w-4 h-4" />
              Gia sư & Từ điển AI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pronunciation')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === 'pronunciation'
                  ? 'text-emerald-600 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
              }`}
            >
              <Mic className="w-4 h-4" />
              Luyện phát âm TOEIC
            </button>
          </div>

          <div className="p-4 lg:p-6">
            {activeTab === 'chat' ? <ChatbotPanel /> : <PronunciationPanel />}
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}

function ChatbotPanel() {
  const { messages, setMessages, clearChat } = useAiTutor();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipInitialScroll = useRef(true);

  useEffect(() => {
    if (skipInitialScroll.current) {
      skipInitialScroll.current = false;
      return;
    }
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const playWordAudio = useCallback((word: string, audioUrl?: string | null) => {
    setPlayingWord(word);
    const finish = () => setPlayingWord(null);

    const speakWithFallback = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      } else {
        finish();
      }
    };

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = finish;
      audio.onerror = () => {
        speakWithFallback();
      };
      audio.play().catch(() => {
        speakWithFallback();
      });
    } else {
      speakWithFallback();
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const now = Date.now();
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: trimmed,
        timestamp: now,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setError(null);

      try {
        // Find timestamp of the last message in current session
        const lastMsg = messages[messages.length - 1];
        const lastTime = lastMsg?.timestamp || 0;
        const isIdleOver30m = lastTime > 0 && now - lastTime > IDLE_TIMEOUT_30M;

        // Check if query is an independent vocabulary lookup
        const isLookup = isIndependentLookup(trimmed);

        let historyPayload: { role: 'user' | 'assistant'; content: string }[] = [];

        // Only attach history if NOT idle timeout (>30m) AND NOT an independent word lookup
        // Sliding window: takes at most 4 most recent messages (2 user-assistant pairs)
        if (!isIdleOver30m && !isLookup) {
          historyPayload = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .slice(-4)
            .map((m) => ({ role: m.role, content: m.content }));
        }

        const res = await fetch('/api/ai-tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history: historyPayload }),
        });

        const data = await res.json();
        if (!res.ok) {
          const detail = [data.error, data.details].filter(Boolean).join(' — ');
          throw new Error(detail || 'Không nhận được phản hồi');
        }

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: data.reply,
            matchedWordData: data.matchedWordData || null,
            model: data.model,
            bouncerHit: data.bouncerHit,
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, setMessages]
  );

  return (
    <div className="flex flex-col h-[min(75vh,680px)]">
      {/* Session header with 24h notice & Clear button */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border/50 text-xs text-muted-foreground">
        <span>Lịch sử hội thoại (Tự động lưu 24h)</span>
        <button
          type="button"
          onClick={clearChat}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title="Làm mới đoạn chat để bắt đầu phiên mới"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới đoạn chat (Clear)</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] md:max-w-[82%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-muted/70 dark:bg-muted/40 border border-border/60 text-foreground rounded-bl-md'
              }`}
            >
              {/* Word pronunciation chip if matched from dictionary */}
              {msg.role === 'assistant' && msg.matchedWordData && (
                <div className="mb-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-emerald-900 dark:text-emerald-200 capitalize">
                          {msg.matchedWordData.word}
                        </span>
                        {msg.matchedWordData.pos && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-emerald-200/70 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                            {msg.matchedWordData.pos}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-0.5">
                        {msg.matchedWordData.us_pron && (
                          <span>US: {msg.matchedWordData.us_pron}</span>
                        )}
                        {msg.matchedWordData.uk_pron && msg.matchedWordData.uk_pron !== msg.matchedWordData.us_pron && (
                          <span>UK: {msg.matchedWordData.uk_pron}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => playWordAudio(msg.matchedWordData!.word, msg.matchedWordData!.audio_url)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      playingWord === msg.matchedWordData.word
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 animate-pulse'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800'
                    }`}
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{playingWord === msg.matchedWordData.word ? 'Đang phát...' : 'Phát âm'}</span>
                  </button>
                </div>
              )}

              {/* Bouncer badge if hit */}
              {msg.role === 'assistant' && msg.bouncerHit && (
                <div className="mb-2 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <Zap className="w-3 h-3" />
                  <span>Phản hồi nhanh AI Tutor</span>
                </div>
              )}

              {/* Message content */}
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-emerald-800 dark:text-emerald-300">
                          {children}
                        </strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      h3: ({ children }) => (
                        <h3 className="font-bold text-sm mt-3 mb-1 text-emerald-800 dark:text-emerald-300">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="font-semibold text-xs mt-2 mb-1">{children}</h4>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded bg-muted-foreground/15 font-mono text-xs text-foreground">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Gia sư AI đang soạn câu trả lời...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => sendMessage(prompt)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tra từ (VD: accommodate, contract) hoặc hỏi ngữ pháp TOEIC..."
          disabled={loading}
          className="flex-1 px-4 py-3 surface-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

function PronunciationPanel() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const sample = PRONUNCIATION_SAMPLES[sampleIndex];

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  const speakReference = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sample.referenceText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói. Dùng Chrome hoặc Edge.');
      return;
    }

    setError(null);
    setResult(null);
    setTranscript('');

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
    };

    recognition.onerror = () => {
      setError('Không thu được giọng nói. Hãy cho phép micro và thử lại.');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const evaluate = async () => {
    if (!transcript.trim()) {
      setError('Chưa có bản ghi âm. Hãy nhấn Record và đọc câu mẫu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceText: sample.referenceText,
          userTranscript: transcript,
          phoneticHint: sample.phoneticHint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Chấm điểm thất bại');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const nextSample = () => {
    setSampleIndex((i) => (i + 1) % PRONUNCIATION_SAMPLES.length);
    setTranscript('');
    setResult(null);
    setError(null);
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {sample.part}
          </span>
          <button
            type="button"
            onClick={nextSample}
            className="text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1"
          >
            Next sample <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="rounded-xl border border-border p-5 bg-gradient-to-br from-muted to-background">
          <p className="text-lg font-semibold text-foreground mb-2">{sample.referenceText}</p>
          <p className="text-sm text-muted-foreground font-mono mb-3">{sample.phoneticHint}</p>
          <p className="text-xs text-muted-foreground/80">{sample.context}</p>
        </div>

        <button
          type="button"
          onClick={speakReference}
          className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Volume2 className="w-4 h-4" />
          Listen to reference
        </button>

        <div className="flex flex-wrap gap-3">
          {!listening ? (
            <button
              type="button"
              onClick={startListening}
              disabled={!speechSupported}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold animate-pulse"
            >
              <MicOff className="w-4 h-4" />
              Stop
            </button>
          )}

          <button
            type="button"
            onClick={evaluate}
            disabled={loading || !transcript}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Grade pronunciation
          </button>
        </div>

        {transcript && (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">You said: </span>
            <span className="text-foreground font-medium">{transcript}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-5 min-h-[280px] surface-panel">
        <h3 className="text-sm font-semibold text-foreground mb-4">Grading Result</h3>

        {!result && !loading && (
          <p className="text-sm text-muted-foreground">
            Đọc câu mẫu, nhấn Record, sau đó Grade pronunciation để nhận điểm Accuracy, Fluency và Prosody.
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className={`text-4xl font-bold ${scoreColor(result.overallScore)}`}>
                {result.overallScore}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Overall</div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Accuracy', value: result.accuracy },
                { label: 'Fluency', value: result.fluency },
                { label: 'Prosody', value: result.prosody },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted py-2">
                  <div className={`text-lg font-bold ${scoreColor(item.value)}`}>{item.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{item.label}</div>
                </div>
              ))}
            </div>

            <p className="text-sm text-foreground">{result.summary}</p>

            {result.wordFeedback?.length > 0 && (
              <ul className="space-y-2 text-sm">
                {result.wordFeedback.map((wf, i) => (
                  <li key={i} className="rounded-lg border border-border px-3 py-2">
                    <span className="font-semibold text-foreground">{wf.word}</span>
                    <span className="text-muted-foreground"> — {wf.issue}</span>
                    <p className="text-emerald-700 text-xs mt-0.5">{wf.tip}</p>
                  </li>
                ))}
              </ul>
            )}

            {result.practiceTip && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <strong>Tip:</strong> {result.practiceTip}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Video, ChevronDown, ChevronUp } from "lucide-react";
import PageShell from "@/components/PageShell";
import PageContainer from "@/components/PageContainer";
import InterviewMeetLobby from "@/components/interview/InterviewMeetLobby";
import {
  CATEGORY_TABS,
  LEVEL_FILTERS,
  type ExperienceLevel,
  type InterviewCategory,
  getTechnologiesByCategory,
} from "@/lib/interview-data";

type DisplayQuestion = {
  id: string;
  level: ExperienceLevel;
  question: string;
  answer?: string;
};

export default function InterviewPage() {
  const [category, setCategory] = useState<InterviewCategory>("fullstack");
  const [selectedTechId, setSelectedTechId] = useState("java");
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);
  const [questions, setQuestions] = useState<DisplayQuestion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [countByTech, setCountByTech] = useState<Record<string, number>>({});
  const [meetLobbyOpen, setMeetLobbyOpen] = useState(false);

  const technologies = useMemo(() => getTechnologiesByCategory(category), [category]);

  const selectedTech = useMemo(
    () => technologies.find((tech) => tech.id === selectedTechId) ?? technologies[0],
    [technologies, selectedTechId]
  );

  const techCount = selectedTech ? (countByTech[selectedTech.id] ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const res = await fetch("/api/interview-questions?stats=1");
        const data = await res.json();
        if (!cancelled && data.success) {
          setTotalCount(data.data?.total ?? 0);
          setCountByTech(data.data?.byTechnology ?? {});
        }
      } catch {
        if (!cancelled) {
          setTotalCount(0);
          setCountByTech({});
        }
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTech) return;

    let cancelled = false;
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          technology_id: selectedTech.id,
          category,
        });
        if (selectedLevel) params.set("level", selectedLevel);

        const res = await fetch(`/api/interview-questions?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setQuestions(
            (data.data?.questions || []).map(
              (q: { id: string; level: ExperienceLevel; question: string; answer: string }) => ({
                id: q.id,
                level: q.level,
                question: q.question,
                answer: q.answer,
              })
            )
          );
        } else if (!cancelled) {
          setQuestions([]);
        }
      } catch {
        if (!cancelled) setQuestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [selectedTech, category, selectedLevel]);

  const handleCategoryChange = (nextCategory: InterviewCategory) => {
    setCategory(nextCategory);
    const firstTech = getTechnologiesByCategory(nextCategory)[0];
    if (firstTech) setSelectedTechId(firstTech.id);
    setSelectedLevel(null);
    setExpandedId(null);
  };

  return (
    <PageShell className="pb-16">
      <InterviewMeetLobby open={meetLobbyOpen} onClose={() => setMeetLobbyOpen(false)} />
      <section className="page-hero bg-gradient-to-b from-indigo-50/40 dark:from-indigo-950/20 to-background">
        <PageContainer className="py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-4">
                Thách thức mọi câu hỏi phỏng vấn
                <br />
                dành cho lập trình viên
              </h1>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
                <span className="font-bold">{totalCount.toLocaleString()}</span>
                <span>câu hỏi phỏng vấn Full-Stack, Coding &amp; System Design Interview</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMeetLobbyOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
                >
                  <Video className="w-4 h-4" />
                  Tạo phòng phỏng vấn
                </button>
              </div>
            </div>

            <div className="hidden lg:flex justify-end">
              <div className="relative w-full max-w-md h-64">
                <div className="absolute inset-0 bg-violet-100/50 rounded-3xl" />
                <div className="absolute bottom-4 left-8 right-8 h-40 bg-card rounded-xl shadow-lg border border-border p-4">
                  <div className="grid grid-cols-2 gap-2 h-full">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center"
                      >
                        <div className="w-8 h-8 rounded-full bg-violet-300/60" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-24">
                  <div className="w-10 h-10 rounded-full bg-violet-500 mx-auto mb-1" />
                  <div className="w-12 h-14 rounded-t-full bg-violet-600 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer className="py-10">
        <div className="rounded-2xl surface-panel shadow-sm overflow-hidden">
          <div className="flex flex-wrap border-b border-border">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  category === tab.id
                    ? "text-violet-600 border-violet-600 bg-violet-50/50 dark:bg-violet-950/30"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => {
                const count = countByTech[tech.id] ?? 0;
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => {
                      setSelectedTechId(tech.id);
                      setSelectedLevel(null);
                      setExpandedId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedTech?.id === tech.id
                        ? "bg-rose-50 dark:bg-rose-950/30 text-violet-700 dark:text-violet-300 border-rose-200 dark:border-rose-900 shadow-sm"
                        : "bg-card text-foreground border-border hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
                    }`}
                  >
                    <span>{tech.icon}</span>
                    <span>{tech.name}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PageContainer>

      <PageContainer>
        {selectedTech && (
          <>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">
              {techCount > 0
                ? `Top ${techCount} câu hỏi phỏng vấn ${selectedTech.name}`
                : `Câu hỏi phỏng vấn ${selectedTech.name}`}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span className="text-sm font-medium text-muted-foreground">Bộ lọc:</span>
              {LEVEL_FILTERS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(selectedLevel === level.id ? null : level.id);
                    setExpandedId(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 bg-card transition-all ${
                    level.borderColor
                  } ${level.textColor} ${
                    selectedLevel === level.id ? "shadow-md scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>

            {loading && (
              <p className="text-sm text-muted-foreground mb-4">Đang tải câu hỏi...</p>
            )}

            <div className="space-y-3">
              {questions.length > 0 ? (
                questions.map((item, index) => {
                  const isExpanded = expandedId === item.id;
                  const hasAnswer = Boolean(item.answer?.trim());

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm transition-all overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full flex items-start gap-4 p-5 text-left group"
                      >
                        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-muted group-hover:bg-violet-100 dark:group-hover:bg-violet-950/40 text-muted-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300 flex items-center justify-center text-sm font-bold">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-foreground font-medium group-hover:text-violet-800 dark:group-hover:text-violet-300 transition-colors">
                            {item.question}
                          </p>
                          {hasAnswer && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {isExpanded ? "Ẩn đáp án" : "Xem đáp án"}
                            </p>
                          )}
                        </div>
                        {hasAnswer &&
                          (isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0 mt-2" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 mt-2" />
                          ))}
                      </button>
                      {isExpanded && hasAnswer && (
                        <div className="px-5 pb-5 pl-[4.5rem] border-t border-border bg-muted/30">
                          <p className="text-xs font-semibold text-emerald-600 uppercase mb-2 pt-3">Đáp án mẫu</p>
                          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                !loading && (
                  <div className="text-center py-16 rounded-xl border border-dashed border-border bg-muted">
                    <p className="text-muted-foreground mb-2">
                      Chưa có câu hỏi cho {selectedTech.name}.
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                      Admin sẽ bổ sung câu hỏi phỏng vấn — quay lại sau nhé.
                    </p>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </PageContainer>
    </PageShell>
  );
}

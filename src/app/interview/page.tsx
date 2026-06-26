"use client";

import { useMemo, useState } from "react";
import { Download, Globe } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import {
  CATEGORY_TABS,
  LEVEL_FILTERS,
  type ExperienceLevel,
  type InterviewCategory,
  getQuestions,
  getTechnologiesByCategory,
  getTotalQuestionCount,
} from "@/lib/interview-data";

export default function InterviewPage() {
  const [category, setCategory] = useState<InterviewCategory>("fullstack");
  const [selectedTechId, setSelectedTechId] = useState("java");
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);

  const technologies = useMemo(() => getTechnologiesByCategory(category), [category]);

  const selectedTech = useMemo(
    () => technologies.find((tech) => tech.id === selectedTechId) ?? technologies[0],
    [technologies, selectedTechId]
  );

  const questions = useMemo(() => {
    if (!selectedTech) return [];
    return getQuestions(selectedTech.id, selectedLevel);
  }, [selectedTech, selectedLevel]);

  const displayCount = selectedTech?.count ?? 0;

  const handleCategoryChange = (nextCategory: InterviewCategory) => {
    setCategory(nextCategory);
    const firstTech = getTechnologiesByCategory(nextCategory)[0];
    if (firstTech) setSelectedTechId(firstTech.id);
    setSelectedLevel(null);
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-indigo-50/40 to-white">
        <PageContainer className="py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 leading-tight mb-4">
                Thách thức mọi câu hỏi phỏng vấn
                <br />
                dành cho lập trình viên
              </h1>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
                <span className="font-bold">{getTotalQuestionCount().toLocaleString()}</span>
                <span>câu hỏi phỏng vấn Full-Stack, Coding &amp; System Design Interview</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Câu hỏi Global
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống Ebook cẩm nang phỏng vấn
                </button>
              </div>
            </div>

            <div className="hidden lg:flex justify-end">
              <div className="relative w-full max-w-md h-64">
                <div className="absolute inset-0 bg-violet-100/50 rounded-3xl" />
                <div className="absolute bottom-4 left-8 right-8 h-40 bg-white rounded-xl shadow-lg border border-gray-100 p-4">
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

      {/* Category + tags */}
      <PageContainer className="py-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-100">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  category === tab.id
                    ? "text-violet-600 border-violet-600 bg-violet-50/50"
                    : "text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => {
                    setSelectedTechId(tech.id);
                    setSelectedLevel(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedTech?.id === tech.id
                      ? "bg-rose-50 text-violet-700 border-rose-200 shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:border-violet-200 hover:bg-violet-50/50"
                  }`}
                >
                  <span>{tech.icon}</span>
                  <span>{tech.name}</span>
                  <span className="text-gray-400">({tech.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Questions */}
      <PageContainer>
        {selectedTech && (
          <>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6">
              Top {displayCount} câu hỏi phỏng vấn {selectedTech.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span className="text-sm font-medium text-gray-600">Bộ lọc:</span>
              {LEVEL_FILTERS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() =>
                    setSelectedLevel(selectedLevel === level.id ? null : level.id)
                  }
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 bg-white transition-all ${
                    level.borderColor
                  } ${level.textColor} ${
                    selectedLevel === level.id ? "shadow-md scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {questions.length > 0 ? (
                questions.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 bg-white hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 group-hover:bg-violet-100 text-gray-600 group-hover:text-violet-700 flex items-center justify-center text-sm font-bold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-gray-800 font-medium pt-2 group-hover:text-violet-800 transition-colors">
                      {item.question}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                  <p className="text-gray-500 mb-2">
                    Chưa có câu hỏi mẫu cho bộ lọc này.
                  </p>
                  <p className="text-sm text-gray-400">
                    Hệ thống đang hiển thị {displayCount} câu hỏi {selectedTech.name} — dữ liệu đầy đủ sẽ được bổ sung sau.
                  </p>
                </div>
              )}
            </div>

            {questions.length > 0 && questions.length < displayCount && (
              <p className="text-center text-sm text-gray-400 mt-8">
                Hiển thị {questions.length} / {displayCount} câu hỏi mẫu
              </p>
            )}
          </>
        )}
      </PageContainer>
    </div>
  );
}

'use client';



import { useEffect, useState } from 'react';

import Link from 'next/link';

import { Brain, Search, Loader, Sparkles, Layers, AlertCircle } from 'lucide-react';

import PageContainer from '@/components/PageContainer';

import PageShell from '@/components/PageShell';



interface PublicReviewTopic {

  id: string;

  title: string;

  description: string | null;

  toeic_level: string;

  card_count: number;

  created_at: string;

}



const LEVEL_LABEL: Record<string, string> = {

  beginner: 'Beginner',

  intermediate: 'Intermediate',

  advanced: 'Advanced',

};



const LEVEL_CLASS: Record<string, string> = {

  beginner: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',

  intermediate: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',

  advanced: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',

};



export default function ReviewPage() {

  const [topics, setTopics] = useState<PublicReviewTopic[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [levelFilter, setLevelFilter] = useState('');



  const fetchTopics = async (search = searchQuery) => {

    try {

      setLoading(true);

      setError(null);

      const params = new URLSearchParams();

      if (search.trim()) params.set('search', search.trim());

      if (levelFilter) params.set('toeic_level', levelFilter);



      const res = await fetch(`/api/review-topics?${params.toString()}`);

      const data = await res.json();

      if (!res.ok || !data.success) {

        throw new Error(data.message || 'Không tải được chủ đề ôn tập');

      }

      setTopics(data.data.topics || []);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Lỗi không xác định');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchTopics();

  }, [levelFilter]);



  const handleSearch = (e: React.FormEvent) => {

    e.preventDefault();

    fetchTopics(searchQuery);

  };



  return (

    <PageShell className="pb-16">

      <section className="page-hero bg-gradient-to-b from-violet-50/50 dark:from-violet-950/20 to-background">

        <PageContainer className="py-12 lg:py-14">

          <div className="max-w-2xl">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-4">

              <Brain className="w-3.5 h-3.5" />

              AI Flashcard TOEIC

            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">

              Ôn tập từ vựng theo chủ đề

            </h1>

            <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">

              Chọn chủ đề do admin xuất bản — luyện flashcard với điền từ, phát âm và spaced repetition.

            </p>

          </div>

        </PageContainer>

      </section>



      <PageContainer className="py-8">

        <div className="flex flex-col sm:flex-row gap-3 mb-8">

          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <input

              type="text"

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              placeholder="Tìm chủ đề (Travel, Business...)"

              className="w-full pl-10 pr-4 py-2.5 surface-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

            />

          </form>

          <select

            value={levelFilter}

            onChange={(e) => setLevelFilter(e.target.value)}

            className="px-4 py-2.5 surface-input rounded-xl text-sm"

          >

            <option value="">Tất cả trình độ</option>

            <option value="beginner">Beginner</option>

            <option value="intermediate">Intermediate</option>

            <option value="advanced">Advanced</option>

          </select>

        </div>



        {loading && (

          <div className="flex justify-center py-20">

            <Loader className="w-10 h-10 text-violet-600 animate-spin" />

          </div>

        )}



        {error && (

          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-700 dark:text-red-400 mb-6">

            <AlertCircle className="w-4 h-4 shrink-0" />

            {error}

          </div>

        )}



        {!loading && !error && topics.length === 0 && (

          <div className="text-center py-20 text-muted-foreground">

            <Layers className="w-12 h-12 mx-auto mb-3 opacity-40" />

            <p>Chưa có chủ đề ôn tập nào được xuất bản.</p>

          </div>

        )}



        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">

          {topics.map((topic) => (

            <Link

              key={topic.id}

              href={`/review/${topic.id}`}

              className="group block surface-panel rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all"

            >

              <div className="flex items-start justify-between gap-2 mb-3">

                <span

                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${

                    LEVEL_CLASS[topic.toeic_level] || 'bg-muted text-muted-foreground'

                  }`}

                >

                  {LEVEL_LABEL[topic.toeic_level] || topic.toeic_level}

                </span>

                <span className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">

                  <Sparkles className="w-3.5 h-3.5" />

                  {topic.card_count} cards

                </span>

              </div>

              <h2 className="text-lg font-bold text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors mb-2">

                {topic.title}

              </h2>

              {topic.description && (

                <p className="text-sm text-muted-foreground line-clamp-2">{topic.description}</p>

              )}

              <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mt-4 group-hover:underline">

                Bắt đầu ôn tập →

              </p>

            </Link>

          ))}

        </div>

      </PageContainer>

    </PageShell>

  );

}



-- NikaLearn: Review / Flashcard management (AI TOEIC vocabulary)
-- Run in Supabase → SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.review_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT DEFAULT '',
  toeic_level TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (toeic_level IN ('beginner', 'intermediate', 'advanced')),
  target_word_count INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  ai_model TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.review_topics(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning_vi TEXT NOT NULL DEFAULT '',
  ipa TEXT DEFAULT '',
  example_en TEXT DEFAULT '',
  fill_blank TEXT DEFAULT '',
  fill_answer TEXT DEFAULT '',
  image_prompt TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_topics_status ON public.review_topics(status);
CREATE INDEX IF NOT EXISTS idx_review_topics_created_at ON public.review_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_flashcards_topic_id ON public.review_flashcards(topic_id);

ALTER TABLE public.review_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_topics_service_all ON public.review_topics;
DROP POLICY IF EXISTS review_flashcards_service_all ON public.review_flashcards;

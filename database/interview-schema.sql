-- NikaLearn: Interview question management (programming interviews)
-- Run in Supabase → SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.interview_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  technology_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fullstack'
    CHECK (category IN ('fullstack', 'coding', 'system')),
  description TEXT DEFAULT '',
  target_question_count INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.interview_topics(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'middle'
    CHECK (level IN ('entry', 'junior', 'middle', 'senior', 'expert')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_topics_status ON public.interview_topics(status);
CREATE INDEX IF NOT EXISTS idx_interview_topics_category ON public.interview_topics(category);
CREATE INDEX IF NOT EXISTS idx_interview_topics_technology ON public.interview_topics(technology_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_topic_id ON public.interview_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_level ON public.interview_questions(level);

ALTER TABLE public.interview_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_topics_service_all ON public.interview_topics;
DROP POLICY IF EXISTS interview_questions_service_all ON public.interview_questions;

-- Video interview rooms (Jitsi) — host = room creator
CREATE TABLE IF NOT EXISTS public.interview_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_user_id UUID NOT NULL,
  moderator_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interview_rooms_code ON public.interview_rooms(code);
CREATE INDEX IF NOT EXISTS idx_interview_rooms_host ON public.interview_rooms(host_user_id);

ALTER TABLE public.interview_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS interview_rooms_service_all ON public.interview_rooms;

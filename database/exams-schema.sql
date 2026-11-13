-- NikaLearn: Exam management tables (AZtest-inspired)
-- Run in Supabase → SQL Editor if auto-setup fails

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  code TEXT,
  description TEXT DEFAULT '',
  exam_type TEXT NOT NULL DEFAULT 'practice'
    CHECK (exam_type IN ('practice', 'graded')),
  subject TEXT NOT NULL DEFAULT 'TOEIC',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_score NUMERIC NOT NULL DEFAULT 100,
  pass_score NUMERIC NOT NULL DEFAULT 50,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_answers BOOLEAN NOT NULL DEFAULT false,
  show_explanation TEXT NOT NULL DEFAULT 'below'
    CHECK (show_explanation IN ('none', 'below', 'popup')),
  question_input_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (question_input_method IN ('manual', 'bank', 'import')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  points NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question_id ON public.exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; allow anon read published if needed later
DROP POLICY IF EXISTS exams_service_all ON public.exams;
DROP POLICY IF EXISTS exam_questions_service_all ON public.exam_questions;
DROP POLICY IF EXISTS exam_answers_service_all ON public.exam_answers;

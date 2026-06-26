-- Fix column types after first migration (run in SQL Editor if import failed on courses)
ALTER TABLE public."courses"
  ALTER COLUMN "rating" TYPE NUMERIC USING "rating"::numeric,
  ALTER COLUMN "price" TYPE NUMERIC USING "price"::numeric;

ALTER TABLE public."enrollments"
  ALTER COLUMN "progress_percentage" TYPE NUMERIC USING "progress_percentage"::numeric;

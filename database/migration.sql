-- DHV LearnX database migration
-- Run this in NEW Supabase → SQL Editor
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public."users" (
  "id" UUID NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "phone" TEXT,
  "bio" TEXT,
  "membership_type" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "membership_expires_at" TIMESTAMPTZ,
  "learning_streak" INTEGER NOT NULL,
  "total_study_time" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "is_verified" BOOLEAN NOT NULL,
  "last_login" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "failed_login_attempts" INTEGER NOT NULL,
  "locked_until" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."categories" (
  "id" UUID NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon_url" TEXT,
  "sort_order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."courses" (
  "id" UUID NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "short_description" TEXT NOT NULL,
  "thumbnail_url" TEXT NOT NULL,
  "instructor_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "level" TEXT NOT NULL,
  "price" NUMERIC NOT NULL,
  "is_free" BOOLEAN NOT NULL,
  "is_published" BOOLEAN NOT NULL,
  "estimated_duration" INTEGER NOT NULL,
  "rating" NUMERIC NOT NULL,
  "total_students" INTEGER NOT NULL,
  "total_lessons" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "trailer_url" TEXT,
  "rating_count" INTEGER NOT NULL,
  "search_vector" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public."chapters" (
  "id" UUID NOT NULL PRIMARY KEY,
  "course_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "is_published" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."lessons" (
  "id" UUID NOT NULL PRIMARY KEY,
  "chapter_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "video_url" TEXT,
  "video_duration" INTEGER,
  "sort_order" INTEGER NOT NULL,
  "is_preview" BOOLEAN NOT NULL,
  "is_published" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "youtube_backup_url" TEXT,
  "lesson_type" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public."enrollments" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "enrolled_at" TIMESTAMPTZ NOT NULL,
  "completed_at" TEXT,
  "progress_percentage" NUMERIC NOT NULL,
  "last_lesson_id" UUID,
  "total_watch_time" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS public."lesson_progress" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "lesson_id" UUID NOT NULL,
  "enrollment_id" UUID NOT NULL,
  "is_completed" BOOLEAN NOT NULL,
  "watch_time" INTEGER NOT NULL,
  "last_position" INTEGER NOT NULL,
  "completed_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."lesson_questions" (
  "id" UUID NOT NULL PRIMARY KEY,
  "lesson_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "is_resolved" BOOLEAN NOT NULL,
  "likes_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "views_count" INTEGER NOT NULL,
  "answers_count" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "search_vector" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public."lesson_answers" (
  "id" UUID NOT NULL PRIMARY KEY,
  "question_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "is_accepted" BOOLEAN NOT NULL,
  "likes_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."lesson_question_likes" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "question_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."lesson_answer_likes" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "answer_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."user_metadata" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "meta_key" TEXT NOT NULL,
  "meta_value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

-- Table notes: no sample data, skipped

-- Table learning_activities: no sample data, skipped

CREATE TABLE IF NOT EXISTS public."blog_categories" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."blog_tags" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."blog_posts" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "cover_image" TEXT,
  "status" TEXT NOT NULL,
  "view_count" INTEGER NOT NULL,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "search_vector" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public."blog_post_categories" (
  "post_id" INTEGER NOT NULL,
  "category_id" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public."blog_post_tags" (
  "post_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL
);

-- Table blog_comments: no sample data, skipped

-- Table blog_likes: no sample data, skipped

CREATE TABLE IF NOT EXISTS public."blog_bookmarks" (
  "post_id" INTEGER NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

-- Table forum_categories: no sample data, skipped

-- Table forum_topics: no sample data, skipped

-- Table forum_replies: no sample data, skipped

-- Table comments: no sample data, skipped

-- Table comment_likes: no sample data, skipped

-- Table flashcards: no sample data, skipped

-- Table flashcard_sessions: no sample data, skipped

-- Table quizzes: no sample data, skipped

-- Table quiz_questions: no sample data, skipped

-- Table quiz_attempts: no sample data, skipped

-- Table payments: no sample data, skipped

-- Table roadmaps: no sample data, skipped

-- Table roadmap_courses: no sample data, skipped

-- Table user_roadmaps: no sample data, skipped


-- RPC functions


-- RPC functions required by the app

CREATE OR REPLACE FUNCTION get_courses_with_details(
  p_limit INT DEFAULT 12,
  p_offset INT DEFAULT 0,
  p_level TEXT DEFAULT NULL,
  p_is_free BOOLEAN DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  level TEXT,
  price NUMERIC,
  is_free BOOLEAN,
  estimated_duration INT,
  rating NUMERIC,
  total_students INT,
  total_lessons INT,
  created_at TIMESTAMPTZ,
  category_name TEXT,
  category_slug TEXT,
  instructor_name TEXT,
  instructor_username TEXT,
  instructor_id UUID,
  instructor_avatar_url TEXT,
  instructor_membership_type TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.title, c.slug, c.short_description, c.thumbnail_url,
    c.level, c.price, c.is_free, c.estimated_duration, c.rating,
    c.total_students, c.total_lessons, c.created_at,
    cat.name, cat.slug,
    u.full_name, u.username, u.id, u.avatar_url, u.membership_type
  FROM courses c
  LEFT JOIN categories cat ON c.category_id = cat.id
  LEFT JOIN users u ON c.instructor_id = u.id
  WHERE c.is_published = true
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_is_free IS NULL OR c.is_free = p_is_free)
    AND (p_category_slug IS NULL OR cat.slug = p_category_slug)
    AND (p_search IS NULL OR c.title ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_courses_with_filters(
  p_level TEXT DEFAULT NULL,
  p_is_free BOOLEAN DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM courses c
  LEFT JOIN categories cat ON c.category_id = cat.id
  WHERE c.is_published = true
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_is_free IS NULL OR c.is_free = p_is_free)
    AND (p_category_slug IS NULL OR cat.slug = p_category_slug)
    AND (p_search IS NULL OR c.title ILIKE '%' || p_search || '%');
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_enrolled_courses(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  course_id UUID,
  course_title TEXT,
  course_slug TEXT,
  course_thumbnail_url TEXT,
  enrolled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress_percentage NUMERIC,
  last_lesson_id UUID,
  total_watch_time INT,
  is_active BOOLEAN
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, c.id, c.title, c.slug, c.thumbnail_url,
    e.enrolled_at, e.completed_at, e.progress_percentage,
    e.last_lesson_id, e.total_watch_time, e.is_active
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id
  WHERE e.user_id = p_user_id AND e.is_active = true
  ORDER BY e.enrolled_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_profile(p_username TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  membership_type TEXT,
  membership_expires_at TIMESTAMPTZ,
  learning_streak INT,
  total_study_time INT,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  total_courses_enrolled BIGINT,
  total_courses_completed BIGINT,
  total_articles_published BIGINT,
  total_forum_posts BIGINT,
  followers_count BIGINT,
  following_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id, u.email, u.username, u.full_name, u.avatar_url, u.bio, u.phone,
    u.membership_type, u.membership_expires_at, u.learning_streak,
    u.total_study_time, u.is_verified, u.created_at,
    (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id),
    (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.completed_at IS NOT NULL),
    (SELECT COUNT(*) FROM blog_posts bp WHERE bp.user_id = u.id AND bp.status = 'published'),
    (SELECT COUNT(*) FROM forum_topics ft WHERE ft.user_id = u.id),
    0::BIGINT,
    0::BIGINT
  FROM users u
  WHERE u.username = p_username
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_blog_posts_with_details(
  p_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'published',
  p_category_id INT DEFAULT NULL,
  p_tag_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  cover_image TEXT,
  status TEXT,
  view_count INT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  membership_type TEXT,
  like_count BIGINT,
  comment_count BIGINT,
  bookmark_count BIGINT,
  category_names TEXT,
  tag_names TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id, bp.user_id, bp.title, bp.slug, bp.excerpt, bp.cover_image,
    bp.status, bp.view_count, bp.published_at, bp.created_at, bp.updated_at,
    u.username, u.full_name, u.avatar_url, u.membership_type,
    (SELECT COUNT(*) FROM blog_likes bl WHERE bl.post_id = bp.id),
    (SELECT COUNT(*) FROM blog_comments bc WHERE bc.post_id = bp.id),
    (SELECT COUNT(*) FROM blog_bookmarks bb WHERE bb.post_id = bp.id),
    NULL::TEXT,
    NULL::TEXT
  FROM blog_posts bp
  JOIN users u ON u.id = bp.user_id
  WHERE (p_status IS NULL OR bp.status = p_status)
    AND (p_search IS NULL OR bp.title ILIKE '%' || p_search || '%')
  ORDER BY bp.published_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_blog_posts(
  p_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'published',
  p_category_id INT DEFAULT NULL,
  p_tag_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM blog_posts bp
  WHERE (p_status IS NULL OR bp.status = p_status)
    AND (p_search IS NULL OR bp.title ILIKE '%' || p_search || '%');
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  excerpt TEXT,
  cover_image TEXT,
  status TEXT,
  view_count INT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  like_count BIGINT,
  comment_count BIGINT,
  bookmark_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id, bp.user_id, bp.title, bp.slug, bp.content, bp.excerpt, bp.cover_image,
    bp.status, bp.view_count, bp.published_at, bp.created_at, bp.updated_at,
    u.username, u.full_name, u.avatar_url, u.bio,
    (SELECT COUNT(*) FROM blog_likes bl WHERE bl.post_id = bp.id),
    (SELECT COUNT(*) FROM blog_comments bc WHERE bc.post_id = bp.id),
    (SELECT COUNT(*) FROM blog_bookmarks bb WHERE bb.post_id = bp.id)
  FROM blog_posts bp
  JOIN users u ON u.id = bp.user_id
  WHERE bp.slug = p_slug
  LIMIT 1;
END;
$$;

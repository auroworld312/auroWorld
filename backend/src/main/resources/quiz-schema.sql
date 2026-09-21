CREATE TABLE IF NOT EXISTS course_quizzes (
    id BIGSERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL REFERENCES course_units(unit_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT FALSE,
    release_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    late_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (NOT published OR (release_at IS NOT NULL AND due_at IS NOT NULL)),
    CHECK (release_at < due_at),
    CHECK (late_until IS NULL OR late_until > due_at)
);
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    submitted_at TIMESTAMPTZ,
    late BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS quiz_one_draft ON quiz_submissions(quiz_id, user_id) WHERE submitted_at IS NULL;
CREATE TABLE IF NOT EXISTS quiz_files (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    submission_id BIGINT REFERENCES quiz_submissions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    media_type TEXT NOT NULL,
    content BYTEA NOT NULL,
    CHECK (octet_length(content) <= 10485760)
);
CREATE INDEX IF NOT EXISTS quiz_unit_index ON course_quizzes(unit_id);
CREATE INDEX IF NOT EXISTS quiz_files_index ON quiz_files(quiz_id, submission_id);
CREATE INDEX IF NOT EXISTS quiz_submissions_index ON quiz_submissions(quiz_id, user_id);
ALTER TABLE course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_files ENABLE ROW LEVEL SECURITY;

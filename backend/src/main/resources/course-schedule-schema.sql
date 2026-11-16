CREATE TABLE IF NOT EXISTS course_teachers (
 course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
 username VARCHAR NOT NULL REFERENCES users(username),
 PRIMARY KEY(course_id,username)
);
CREATE TABLE IF NOT EXISTS course_offerings (
 id BIGSERIAL PRIMARY KEY,
 course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 teacher VARCHAR NOT NULL REFERENCES users(username),
 live_url TEXT NOT NULL DEFAULT '',
 timezone TEXT NOT NULL DEFAULT 'UTC'
);
CREATE TABLE IF NOT EXISTS course_sessions (
 id BIGSERIAL PRIMARY KEY,
 offering_id BIGINT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
 lesson_id INTEGER NOT NULL REFERENCES unit_lessons(lesson_id) ON DELETE CASCADE,
 teacher VARCHAR NOT NULL REFERENCES users(username),
 starts_at TIMESTAMPTZ NOT NULL,
 ends_at TIMESTAMPTZ NOT NULL,
 live_url TEXT NOT NULL DEFAULT '',
 CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS course_sessions_start ON course_sessions(starts_at);
CREATE TABLE IF NOT EXISTS course_session_choices (
 session_id BIGINT NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL,
 PRIMARY KEY(session_id,user_id)
);
ALTER TABLE course_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_session_choices ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS live_events (
 id BIGSERIAL PRIMARY KEY,
 course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 host_name TEXT NOT NULL DEFAULT '',
 starts_at TIMESTAMPTZ NOT NULL,
 ends_at TIMESTAMPTZ NOT NULL,
 live_url TEXT NOT NULL,
 created_by TEXT NOT NULL,
 CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS live_events_course_start ON live_events(course_id,starts_at);
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE live_events ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE live_events DROP CONSTRAINT IF EXISTS live_events_course_id_fkey;
ALTER TABLE live_events ADD CONSTRAINT live_events_course_id_fkey FOREIGN KEY(course_id) REFERENCES courses(course_id) ON DELETE SET NULL;
ALTER TABLE live_events ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS live_event_registrations (
 event_id BIGINT NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL,
 PRIMARY KEY(event_id,user_id)
);
ALTER TABLE live_event_registrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE live_events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE live_events ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT '';

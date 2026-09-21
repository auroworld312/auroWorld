package auroWorld.backend;

import junit.framework.TestCase;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class QuizApiTest extends TestCase {
    private final Instant release = Instant.parse("2026-09-18T14:00:00Z");
    private final Instant due = Instant.parse("2026-09-18T15:00:00Z");
    private final Instant late = Instant.parse("2026-09-18T16:00:00Z");

    private Map<String, Object> quiz(boolean published, boolean allowLate) {
        var row = new HashMap<String, Object>();
        row.put("published", published);
        row.put("release_at", release.toString());
        row.put("due_at", due.toString());
        if (allowLate) row.put("late_until", late.toString());
        return row;
    }
    public void testSubmissionWindowBoundaries() {
        var quiz = quiz(true, false);
        assertFalse(QuizApi.canSubmit(quiz, release.minusNanos(1)));
        assertTrue(QuizApi.canSubmit(quiz, release));
        assertTrue(QuizApi.canSubmit(quiz, due.minusNanos(1)));
        assertFalse(QuizApi.canSubmit(quiz, due));
        assertFalse(QuizApi.canSubmit(quiz(false, true), release));
    }
    public void testLateSubmissionsAndStatus() {
        var quiz = quiz(true, true);
        assertEquals("Scheduled", QuizApi.status(quiz, release.minusSeconds(1)));
        assertEquals("Open", QuizApi.status(quiz, release));
        assertEquals("Late submissions", QuizApi.status(quiz, due));
        assertTrue(QuizApi.canSubmit(quiz, late.minusNanos(1)));
        assertFalse(QuizApi.canSubmit(quiz, late));
        assertEquals("Closed", QuizApi.status(quiz, late));
        assertEquals("Draft", QuizApi.status(quiz(false, false), release));
    }
    public void testScheduleValidation() {
        QuizApi.validateSchedule(false, null, null, null);
        QuizApi.validateSchedule(true, release, due, late);
        for (Instant[] times : new Instant[][]{{null, due, null}, {release, release, null}, {due, release, null}, {release, due, due}}) {
            try { QuizApi.validateSchedule(true, times[0], times[1], times[2]); fail("Invalid schedule was accepted"); }
            catch (QuizApi.Fault expected) { assertEquals(400, expected.code); }
        }
    }
    public void testManagementRequiresRoleAndCourseOwnership() {
        var target = Map.<String, Object>of("instructor", "teacher");
        assertTrue(QuizApi.manage(new QuizApi.User("a", "admin", "admin"), target));
        assertTrue(QuizApi.manage(new QuizApi.User("t", "teacher", "instructor"), target));
        assertFalse(QuizApi.manage(new QuizApi.User("s", "teacher", "user"), target));
        assertFalse(QuizApi.manage(new QuizApi.User("t2", "other", "instructor"), target));
    }
}

package auroWorld.backend;

import java.util.*;
import junit.framework.TestCase;

public class OnlineQuizTest extends TestCase {
    private List<OnlineQuiz.Question> questions() {
        return OnlineQuiz.read("[{\"prompt\":\"One?\",\"options\":[\"A\",\"B\"],\"answer\":0,\"explanation\":\"Because A\"},{\"prompt\":\"Two?\",\"options\":[\"C\",\"D\"],\"answer\":1,\"explanation\":\"Because D\"},{\"prompt\":\"Three?\",\"options\":[\"E\",\"F\"],\"answer\":0,\"explanation\":\"Because E\"}]");
    }
    public void testScoreAndUnansweredReview() {
        var result = OnlineQuiz.grade(questions(), Arrays.asList(0, 0, null));
        assertEquals(1, result.get("correct"));
        assertEquals(3, result.get("total"));
        assertEquals(33.33, result.get("score"));
        assertEquals(100.0, OnlineQuiz.grade(questions(), List.of(0, 1, 0)).get("score"));
        assertEquals(0.0, OnlineQuiz.grade(questions(), Arrays.asList(null, null, null)).get("score"));
    }
    public void testPublicQuestionsDoNotContainAnswersOrExplanations() {
        var questions = OnlineQuiz.publicQuestions(questions());
        assertEquals(Set.of("prompt", "options"), questions.get(0).keySet());
    }
    public void testInvalidQuestionsAndAnswersRejected() {
        var questions = questions();
        questions.get(0).explanation = "";
        try { OnlineQuiz.validate(questions, true); fail(); } catch (QuizApi.Fault expected) { assertEquals(400, expected.code); }
        OnlineQuiz.validate(questions, false);
        questions = questions(); questions.get(0).options = List.of("A", " a ");
        try { OnlineQuiz.validate(questions, true); fail(); } catch (QuizApi.Fault expected) { assertEquals(400, expected.code); }
        try { OnlineQuiz.grade(questions(), List.of(4, 1, 0)); fail(); } catch (QuizApi.Fault expected) { assertEquals(400, expected.code); }
        try { OnlineQuiz.grade(questions(), List.of(0)); fail(); } catch (QuizApi.Fault expected) { assertEquals(400, expected.code); }
    }
}

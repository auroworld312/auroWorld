package auroWorld.backend;

import com.google.gson.Gson;
import java.util.*;

final class OnlineQuiz {
    private static final Gson JSON = new Gson();
    static class Question {
        String prompt;
        List<String> options;
        Integer answer;
        String explanation;
    }

    static List<Question> read(String json) {
        return new ArrayList<>(Arrays.asList(JSON.fromJson(json, Question[].class)));
    }

    static void validate(List<Question> questions, boolean published) {
        check(questions != null && questions.size() <= 100 && (!published || !questions.isEmpty()), "Add between 1 and 100 questions before publishing.");
        for (int i = 0; i < questions.size(); i++) {
            var q = questions.get(i);
            String label = "Question " + (i + 1) + ": ";
            check(q != null, label + "Missing question.");
            check(q.prompt != null && q.prompt.length() <= 10000 && (!published || !q.prompt.isBlank()), label + "Enter a question (up to 10000 characters).");
            check(q.options != null && q.options.size() >= 2 && q.options.size() <= 8, label + "Use 2 to 8 options.");
            for (String option : q.options) check(option != null && option.length() <= 2000 && (!published || !option.isBlank()), label + "Complete every option (up to 2000 characters).");
            if (published) check(q.options.stream().map(String::trim).map(s -> s.toLowerCase(Locale.ROOT)).distinct().count() == q.options.size(), label + "Options must be different.");
            check((!published && q.answer == null) || (q.answer != null && q.answer >= 0 && q.answer < q.options.size()), label + "Choose one correct answer.");
            check(q.explanation != null && q.explanation.length() <= 10000 && (!published || !q.explanation.isBlank()), label + "Enter an explanation (up to 10000 characters).");
        }
    }

    static List<Map<String, Object>> publicQuestions(List<Question> questions) {
        var result = new ArrayList<Map<String, Object>>();
        for (var q : questions) result.add(Map.of("prompt", q.prompt, "options", q.options));
        return result;
    }

    static void validateAnswers(List<Question> questions, List<Integer> answers) {
        check(answers != null && answers.size() == questions.size(), "Answers must match the current question list.");
        for (int i = 0; i < answers.size(); i++) check(answers.get(i) == null || (answers.get(i) >= 0 && answers.get(i) < questions.get(i).options.size()), "Invalid answer selection.");
    }

    static Map<String, Object> grade(List<Question> questions, List<Integer> answers) {
        validate(questions, true);
        validateAnswers(questions, answers);
        var review = new ArrayList<Map<String, Object>>();
        int correct = 0;
        for (int i = 0; i < questions.size(); i++) {
            var q = questions.get(i);
            boolean right = Objects.equals(q.answer, answers.get(i));
            if (right) correct++;
            var row = new LinkedHashMap<String, Object>();
            row.put("prompt", q.prompt); row.put("options", q.options); row.put("answer", q.answer);
            row.put("selected", answers.get(i)); row.put("correct", right); row.put("explanation", q.explanation);
            review.add(row);
        }
        double score = Math.round(correct * 10000.0 / questions.size()) / 100.0;
        return Map.of("correct", correct, "total", questions.size(), "score", score, "questions", review);
    }

    private static void check(boolean valid, String message) {
        if (!valid) throw new QuizApi.Fault(400, message);
    }
}

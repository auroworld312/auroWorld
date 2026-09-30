import { useEffect, useState } from 'react';
import { quizRequest } from './quizApi';

function QuestionArea({ questions, answers, setAnswers, review = false, disabled = false }) {
  const [current, setCurrent] = useState(0);
  const q = questions[current];
  if (!q) return <p>No questions available.</p>;
  const answered = answers.filter(a => a !== null && a !== undefined).length;
  return <div className="online-layout">
    <section className="quiz-card online-question">
      <div className="quiz-row quiz-between"><span className="quiz-tag">{review ? 'Review' : 'Single choice'}</span><strong>Question {current + 1} of {questions.length}</strong></div>
      <h2 className="online-prompt">{q.prompt}</h2>
      <fieldset disabled={disabled || review} className="online-options">
        <legend className="quiz-muted">{review ? 'Your submitted answer' : 'Choose one answer'}</legend>
        {q.options.map((option, i) => <label key={i} className={`online-option ${answers[current] === i ? 'selected' : ''} ${review && q.answer === i ? 'correct' : ''} ${review && answers[current] === i && !q.correct ? 'incorrect' : ''}`}>
          <input type="radio" name={`online-question-${current}`} checked={answers[current] === i} onChange={() => setAnswers(answers.map((a, j) => j === current ? i : a))} />
          <span className="online-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>
          {review && q.answer === i && <strong>Correct answer</strong>}
          {review && answers[current] === i && <strong>Your answer</strong>}
        </label>)}
      </fieldset>
      {review && <div className="online-explanation">
        <strong>{q.correct ? 'Correct' : answers[current] == null ? 'Unanswered' : 'Incorrect'}</strong>
        <h3>Explanation</h3><p>{q.explanation}</p>
      </div>}
      <div className="quiz-row quiz-between" style={{ marginTop: 24 }}>
        <button disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous Question</button>
        <button className="primary" disabled={current === questions.length - 1} onClick={() => setCurrent(current + 1)}>Next Question</button>
      </div>
    </section>
    <aside className="quiz-card online-navigator">
      <h3>Question Navigator</h3><p className="quiz-muted">{review ? 'Review each answer' : `${answered} of ${questions.length} answered`}</p>
      <nav aria-label="Question numbers" className="online-numbers">
        {questions.map((question, i) => {
          const done = answers[i] != null;
          const state = review ? question.correct ? 'correct' : 'incorrect' : done ? 'answered' : '';
          return <button key={i} className={state} aria-current={current === i ? 'step' : undefined} aria-label={`Question ${i + 1}, ${review ? question.correct ? 'correct' : 'incorrect' : done ? 'answered' : 'unanswered'}`} onClick={() => setCurrent(i)}>{i + 1}</button>;
        })}
      </nav>
      <p className="quiz-muted">{review ? 'Green: correct · Red: incorrect or unanswered' : 'Purple: answered · White: unanswered'}</p>
    </aside>
  </div>;
}

export function OnlineResult({ result }) {
  const [review, setReview] = useState(false);
  const percentage = result.correct / result.total * 100;
  return <section>
    {!review ? <div className="quiz-card online-result">
      <div className="online-pie" role="img" aria-label={`${result.correct} correct, ${result.total - result.correct} incorrect or unanswered`} style={{ background: `conic-gradient(#6c63ff 0% ${percentage}%, #e9e5f6 ${percentage}% 100%)` }} />
      <div><span className="quiz-tag">Quiz Completed</span><h2 className="online-score">{result.score} / 100</h2>
        <p><strong>{result.correct}</strong> correct out of <strong>{result.total}</strong> questions</p>
        <p className="quiz-muted">Purple: correct · Light: incorrect or unanswered</p>
        <button className="primary" onClick={() => setReview(true)}>View Explanations</button>
      </div>
    </div> : <>
      <button style={{ marginBottom: 16 }} onClick={() => setReview(false)}>Back to Results</button>
      <QuestionArea questions={result.questions} answers={result.questions.map(q => q.selected ?? null)} review />
    </>}
  </section>;
}

export default function OnlineQuiz({ quiz, canSubmit, onSaved }) {
  const completed = quiz.submissions.find(s => s.submitted_at && s.result);
  const draft = quiz.submissions.find(s => !s.submitted_at);
  const validDraft = draft && draft.question_version === quiz.question_version;
  const [answers, setAnswers] = useState(() => validDraft ? draft.answers : quiz.questions.map(() => null));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(submit) {
    const missing = answers.filter(a => a == null).length;
    if (submit && !window.confirm(`${missing ? `${missing} question(s) are unanswered and will count as incorrect. ` : ''}Submit your quiz? You cannot change answers after submitting.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await quizRequest(`/quizzes/${quiz.id}/online-answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, submit, question_version: quiz.question_version }) });
      setDirty(false);
      if (submit) onSaved(); else setNotice('Draft saved. You can return before the deadline to finish.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (completed) return <OnlineResult result={completed.result} />;
  return <section>
    <p className="quiz-muted">One submission · All questions have equal weight · Save your draft before leaving this page.</p>
    {quiz.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{quiz.instructions}</p>}
    {draft && !validDraft && <p className="quiz-error">Your teacher updated the questions. Please answer the current version; the previous draft no longer applies.</p>}
    <QuestionArea questions={quiz.questions} answers={answers} setAnswers={value => { setAnswers(value); setDirty(true); }} disabled={busy || !canSubmit} />
    {!canSubmit && <p className="quiz-error">The submission window is closed. Answers can no longer be saved or submitted.</p>}
    {error && <p role="alert" className="quiz-error">{error}</p>}
    {notice && <p role="status" className="quiz-success">{notice}</p>}
    <div className="quiz-row"><button disabled={busy || !canSubmit} onClick={() => save(false)}>Save Draft</button><button className="primary" disabled={busy || !canSubmit} onClick={() => save(true)}>{busy ? 'Saving…' : 'Submit Quiz'}</button></div>
  </section>;
}

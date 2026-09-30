import { useId } from 'react';

export const emptyQuestion = () => ({ prompt: '', options: ['', '', '', ''], answer: null, explanation: '' });

export function validateQuestions(questions) {
  if (!questions.length || questions.length > 100) throw new Error('Add between 1 and 100 questions.');
  questions.forEach((q, i) => {
    const label = `Question ${i + 1}: `;
    if (!q.prompt.trim()) throw new Error(label + 'Enter the question.');
    if (q.options.length < 2 || q.options.some(option => !option.trim())) throw new Error(label + 'Complete every option.');
    if (new Set(q.options.map(option => option.trim().toLowerCase())).size !== q.options.length) throw new Error(label + 'Options must be different.');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) throw new Error(label + 'Choose the correct answer.');
    if (!q.explanation.trim()) throw new Error(label + 'Add an explanation.');
  });
}

export default function OnlineQuestions({ questions, onChange, locked = false }) {
  const prefix = useId();
  function change(index, patch) { onChange(questions.map((q, i) => i === index ? { ...q, ...patch } : q)); }
  return <section className="online-builder">
    <div className="quiz-row quiz-between"><h3>Online Questions</h3><span className="quiz-tag">{questions.length} questions · Single choice</span></div>
    <p className="quiz-muted">Enter each question separately. All questions have equal weight. Students see answers and explanations only after submitting.</p>
    {locked && <p className="quiz-muted">Questions are locked because a student has submitted. Create a new quiz to use different questions.</p>}
    <fieldset disabled={locked}>
      {questions.map((q, index) => <section className="quiz-card" key={index}>
        <div className="quiz-row quiz-between"><h4>Question {index + 1}</h4><button type="button" onClick={() => onChange(questions.filter((_, i) => i !== index))}>Remove Question {index + 1}</button></div>
        <label htmlFor={`${prefix}-${index}-prompt`}>Question {index + 1} text</label>
        <textarea id={`${prefix}-${index}-prompt`} maxLength={10000} value={q.prompt} onChange={e => change(index, { prompt: e.target.value })} />
        {q.options.map((option, optionIndex) => <div className="online-builder-option" key={optionIndex}>
          <div><label htmlFor={`${prefix}-${index}-${optionIndex}`}>Option {String.fromCharCode(65 + optionIndex)}</label>
            <input id={`${prefix}-${index}-${optionIndex}`} maxLength={2000} value={option} onChange={e => change(index, { options: q.options.map((v, i) => i === optionIndex ? e.target.value : v) })} /></div>
          <button type="button" disabled={q.options.length <= 2} aria-label={`Remove option ${String.fromCharCode(65 + optionIndex)} from question ${index + 1}`} onClick={() => change(index, { options: q.options.filter((_, i) => i !== optionIndex), answer: q.answer === optionIndex ? null : q.answer > optionIndex ? q.answer - 1 : q.answer })}>Remove</button>
        </div>)}
        <button type="button" disabled={q.options.length >= 8} onClick={() => change(index, { options: [...q.options, ''] })}>Add Option</button>
        <label htmlFor={`${prefix}-${index}-answer`}>Correct answer for question {index + 1}</label>
        <select id={`${prefix}-${index}-answer`} value={q.answer ?? ''} onChange={e => change(index, { answer: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Select correct answer</option>
          {q.options.map((_, i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
        </select>
        <label htmlFor={`${prefix}-${index}-explanation`}>Explanation for question {index + 1}</label>
        <textarea id={`${prefix}-${index}-explanation`} maxLength={10000} value={q.explanation} onChange={e => change(index, { explanation: e.target.value })} />
      </section>)}
      <button type="button" disabled={questions.length >= 100} onClick={() => onChange([...questions, emptyQuestion()])}>Add Question</button>
    </fieldset>
  </section>;
}

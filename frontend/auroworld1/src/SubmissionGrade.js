import { useId, useState } from 'react';
import { Attachment, FilePicker } from './QuizComponents';
import { quizRequest, quizUpload, displayDate, validateFiles } from './quizApi';

export default function SubmissionGrade({ quizId, submission, canManage, onSaved }) {
  const formId = useId();
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(submission.score ?? '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [existing, setExisting] = useState(submission.feedback_files || []);
  const [incoming, setIncoming] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function cancel() {
    setScore(submission.score ?? ''); setFeedback(submission.feedback || '');
    setExisting(submission.feedback_files || []); setIncoming([]); setError(''); setEditing(false);
  }
  async function save() {
    setBusy(true); setError('');
    try {
      if (String(score).trim() === '' || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100) throw new Error('Enter a score between 0 and 100.');
      validateFiles(existing, incoming);
      await quizRequest(`/quizzes/${quizId}/submissions/${submission.id}/grade`, {
        method: 'PUT', body: quizUpload({ score: Number(score), feedback, keep_file_ids: existing.map(f => f.id) }, incoming),
      });
      setEditing(false); onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div style={{ marginTop: 16 }}>
    {submission.graded_at ? <div>
      <h3>Grade: {submission.score} / 100</h3>
      <p className="quiz-muted">Graded: {displayDate(submission.graded_at)}</p>
      {submission.feedback && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{submission.feedback}</p>}
      {!!submission.feedback_files?.length && <>
        <h4>Marked Work</h4>
        {submission.feedback_files.map(file => <Attachment key={file.id} file={file} />)}
      </>}
    </div> : <p className="quiz-muted">Not graded yet.</p>}
    {canManage && !editing && <button onClick={() => setEditing(true)}>{submission.graded_at ? 'Edit Grade' : 'Grade Submission'}</button>}
    {canManage && editing && <div className="quiz-form">
      <fieldset disabled={busy}>
        <label htmlFor={`${formId}-score`}>Score (out of 100)</label>
        <input id={`${formId}-score`} type="number" min="0" max="100" step="any" value={score} onChange={e => setScore(e.target.value)} />
        <label htmlFor={`${formId}-feedback`}>Feedback (optional)</label>
        <textarea id={`${formId}-feedback`} maxLength={20000} value={feedback} onChange={e => setFeedback(e.target.value)} />
        <h4>Marked Work (optional)</h4>
        <FilePicker id={`${formId}-files`} {...{ existing, setExisting, incoming, setIncoming }} />
        <p className="quiz-muted">Saving makes the score, feedback and marked files visible to this student.</p>
        <div className="quiz-row">
          <button className="primary" onClick={save}>{busy ? 'Saving…' : 'Save Grade'}</button>
          <button onClick={cancel}>Cancel</button>
        </div>
      </fieldset>
      {error && <p role="alert" className="quiz-error">{error}</p>}
    </div>}
  </div>;
}

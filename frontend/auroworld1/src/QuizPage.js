import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { Attachment, FilePicker, QuizEditor } from './QuizComponents';
import { quizRequest, quizUpload, displayDate, localZone, validateFiles } from './quizApi';
import './Quiz.css';

function AnswerForm({ quiz, onSaved, disabled }) {
  const draft = quiz.submissions.find(s => !s.submitted_at);
  const [existing, setExisting] = useState(draft?.files || []);
  const [incoming, setIncoming] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(submit) {
    setBusy(true); setError('');
    try {
      validateFiles(existing, incoming);
      if (!existing.length && !incoming.length) throw new Error('Upload an answer file first.');
      await quizRequest(`/quizzes/${quiz.id}/answers`, {
        method: 'POST', body: quizUpload({ submit, keep_file_ids: existing.map(f => f.id) }, incoming),
      });
      onSaved(submit ? 'Your answer was submitted successfully.' : 'Your answer draft was saved. It has not been submitted.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="quiz-card quiz-form">
    <h3>Upload Your Answer</h3>
    <p className="quiz-muted">You can submit again while the submission window is open. Each submitted version is retained.</p>
    <fieldset disabled={busy || disabled}>
      <FilePicker id="quiz-answer-files" {...{ existing, setExisting, incoming, setIncoming }} />
      <div className="quiz-row" style={{ marginTop: 16 }}>
        <button onClick={() => save(false)}>Save Draft</button>
        <button className="primary" onClick={() => save(true)}>{busy ? 'Uploading…' : 'Submit Answer'}</button>
      </div>
    </fieldset>
    {disabled && <p className="quiz-muted">Submissions are currently closed. Existing submitted answers remain saved.</p>}
    {error && <p className="quiz-error" role="alert">{error}</p>}
  </div>;
}

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const load = useCallback(async () => {
    try {
      const result = await quizRequest(`/quizzes/${quizId}`);
      setOffset(Date.parse(result.server_now) - Date.now());
      setQuiz(result); setError(''); setRevision(r => r + 1);
    } catch (e) { setError(e.message); }
  }, [quizId]);
  useEffect(() => { setQuiz(null); setNotice(''); setEditing(false); load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!quiz || quiz.status !== 'Scheduled') return;
    const remaining = Date.parse(quiz.release_at) - (Date.now() + offset);
    const timer = setTimeout(load, Math.min(Math.max(remaining + 100, 1000), 2147483647));
    return () => clearTimeout(timer);
  }, [quiz, offset, load]);
  const now = clock + offset;
  const released = quiz?.published && now >= Date.parse(quiz.release_at);
  const canSubmit = released && now < Date.parse(quiz.late_until || quiz.due_at);
  const status = !quiz?.published ? 'Draft' : !released ? 'Scheduled' : !canSubmit ? 'Closed' : now >= Date.parse(quiz.due_at) ? 'Late submissions' : 'Open';
  return <div className="quiz-page">
    <Sidebar />
    <div className="quiz-page-main"><Header />
      <main className="quiz-page-content quiz-panel"><div className="quiz-page-inner">
        <button style={{ marginBottom: 16 }} onClick={() => quiz ? navigate(`/courses/${quiz.course_id}`, { state: { activeTab: 'materials', unitId: quiz.unit_id, unitTab: 'quizzes' } }) : navigate('/courses')}>← Back to Materials</button>
        {error && <p className="quiz-error" role="alert">{error} <button onClick={load}>Retry</button></p>}
        {notice && <p className="quiz-success" role="status">{notice}</p>}
        {!quiz && !error && <p>Loading quiz…</p>}
        {quiz && <>
          <section className="quiz-card">
            <div className="quiz-row quiz-between"><h1>{quiz.title}</h1><span className="quiz-tag">{status}</span></div>
            <p>{quiz.course_title} / {quiz.unit_title}</p>
            <p className="quiz-muted">Release: {displayDate(quiz.release_at)}<br />Due: {displayDate(quiz.due_at)}<br />
              {quiz.late_until ? `Late submissions accepted until ${displayDate(quiz.late_until)}` : 'Late submissions are not allowed.'}<br />Time zone: {localZone}</p>
            {quiz.can_manage && <button onClick={() => setEditing(!editing)}>{editing ? 'Close Editor' : 'Edit Quiz'}</button>}
          </section>
          {editing && quiz.can_manage && <QuizEditor key={revision} quiz={quiz} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice('Quiz saved. Calendar deadlines will use the updated dates.'); load(); }} />}
          {quiz.can_manage || released ? <section className="quiz-card">
            <h2>Question Files</h2>
            {quiz.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{quiz.instructions}</p>}
            {!quiz.files.length && <p className="quiz-muted">No question files uploaded yet.</p>}
            {quiz.files.map(file => <Attachment key={file.id} file={file} />)}
          </section> : <section className="quiz-card"><h2>Not Open Yet</h2><p>Question files will be available at {displayDate(quiz.release_at)}.</p></section>}
          {!quiz.can_manage && released && <AnswerForm key={`${quiz.id}-${revision}`} quiz={quiz} disabled={!canSubmit} onSaved={message => { setNotice(message); load(); }} />}
          <section className="quiz-card">
            <h2>{quiz.can_manage ? 'Student Submissions' : 'My Submissions'}</h2>
            {!quiz.submissions.length && <p className="quiz-muted">No submissions yet.</p>}
            {quiz.submissions.map(submission => <div className="quiz-card" key={submission.id}>
              <div className="quiz-row quiz-between"><strong>{quiz.can_manage ? submission.username : `Answer #${submission.id}`}</strong>
                <span className="quiz-tag">{!submission.submitted_at ? 'Draft — not submitted' : submission.late ? 'Submitted late' : 'Submitted on time'}</span></div>
              {submission.submitted_at && <p className="quiz-muted">Submitted: {displayDate(submission.submitted_at)}</p>}
              {submission.files.map(file => <Attachment key={file.id} file={file} />)}
            </div>)}
          </section>
        </>}
      </div></main>
    </div>
  </div>;
}

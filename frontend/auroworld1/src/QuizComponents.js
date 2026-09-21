import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizRequest, quizUpload, FILE_ACCEPT, TIME_OPTIONS, localZone, displayDate, splitDate, dateInstant, validateFiles } from './quizApi';
import './Quiz.css';

export function Attachment({ file }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function open(preview) {
    setBusy(true); setError('');
    try {
      const blob = await quizRequest(`/files/${file.id}`, {}, true);
      const objectUrl = URL.createObjectURL(blob);
      if (preview) setUrl(objectUrl);
      else {
        const link = document.createElement('a');
        link.href = objectUrl; link.download = file.filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const previewable = file.media_type === 'application/pdf' || ['image/png', 'image/jpeg', 'image/webp'].includes(file.media_type);
  return <div>
    <div className="quiz-file">
      <span>{file.filename} <small className="quiz-muted">({Math.ceil(file.size / 1024)} KB)</small></span>
      <button disabled={busy} onClick={() => open(false)}>Download</button>
      {previewable && <button disabled={busy} onClick={() => url ? setUrl('') : open(true)}>{url ? 'Close preview' : 'Preview'}</button>}
    </div>
    {error && <p role="alert" className="quiz-error">{error}</p>}
    {url && (file.media_type === 'application/pdf'
      ? <iframe className="quiz-preview" src={url} title={file.filename} />
      : <img className="quiz-preview-image" src={url} alt={file.filename} />)}
  </div>;
}

export function FilePicker({ existing, setExisting, incoming, setIncoming, id }) {
  const [error, setError] = useState('');
  return <div>
    <label htmlFor={id}>Files</label>
    <p className="quiz-muted">PDF, Office documents, text, CSV or images. Up to 5 files, 10 MB each, 30 MB total.</p>
    <input id={id} type="file" multiple accept={FILE_ACCEPT} onChange={e => {
      const additions = [...e.target.files];
      try { validateFiles(existing, [...incoming, ...additions]); setIncoming([...incoming, ...additions]); setError(''); }
      catch (err) { setError(err.message); }
      e.target.value = '';
    }} />
    {error && <p role="alert" className="quiz-error">{error}</p>}
    {existing.map(file => <div className="quiz-file" key={file.id}><span>{file.filename}</span><button type="button" onClick={() => setExisting(existing.filter(f => f.id !== file.id))}>Remove</button></div>)}
    {incoming.map((file, i) => <div className="quiz-file" key={`${file.name}-${i}`}><span>{file.name}</span><button type="button" onClick={() => setIncoming(incoming.filter((_, index) => index !== i))}>Remove</button></div>)}
  </div>;
}

function DateTimePicker({ label, value, onChange, id }) {
  return <div>
    <label htmlFor={`${id}-date`}>{label}</label>
    <div className="quiz-date">
      <input id={`${id}-date`} aria-label={`${label} date`} type="date" value={value.date} onKeyDown={e => { if (e.key !== 'Tab') e.preventDefault(); if (e.key === 'Enter' || e.key === ' ') e.currentTarget.showPicker?.(); }} onClick={e => e.currentTarget.showPicker?.()} onChange={e => onChange({ ...value, date: e.target.value })} />
      <select aria-label={`${label} time`} value={value.time} onChange={e => onChange({ ...value, time: e.target.value })}>
        <option value="">Select time</option>
        {value.time && !TIME_OPTIONS.some(t => t.value === value.time) && <option value={value.time}>{value.time}</option>}
        {TIME_OPTIONS.map(time => <option key={time.value} value={time.value}>{time.label}</option>)}
      </select>
    </div>
  </div>;
}

export function QuizEditor({ unitId, quiz, onSaved, onCancel, onDeleted }) {
  const formId = useId();
  const [title, setTitle] = useState(quiz?.title || '');
  const [instructions, setInstructions] = useState(quiz?.instructions || '');
  const [release, setRelease] = useState(splitDate(quiz?.release_at));
  const [due, setDue] = useState(splitDate(quiz?.due_at));
  const [allowLate, setAllowLate] = useState(!!quiz?.late_until);
  const [late, setLate] = useState(splitDate(quiz?.late_until));
  const [existing, setExisting] = useState(quiz?.files || []);
  const [incoming, setIncoming] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function deleteQuiz() {
    if (!window.confirm(`Delete "${quiz.title}"? All question files, student submissions, grades and feedback will be permanently deleted. This cannot be undone.`)) return;
    setError(''); setBusy(true);
    try {
      await quizRequest(`/quizzes/${quiz.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function save(published) {
    setError(''); setBusy(true);
    try {
      if (!title.trim()) throw new Error('Enter a quiz title.');
      const releaseAt = dateInstant(release), dueAt = dateInstant(due), lateUntil = allowLate ? dateInstant(late) : null;
      if (published && (!releaseAt || !dueAt)) throw new Error('Select release and due dates and times.');
      if ((releaseAt || dueAt || lateUntil) && (!releaseAt || !dueAt || dueAt <= releaseAt)) throw new Error('Due date must be after release date.');
      if (allowLate && (!lateUntil || !dueAt || lateUntil <= dueAt)) throw new Error('Choose a late deadline after the normal due date.');
      validateFiles(existing, incoming);
      if (published && !existing.length && !incoming.length) throw new Error('Upload a question file before publishing.');
      const result = await quizRequest(quiz ? `/quizzes/${quiz.id}` : `/units/${unitId}`, {
        method: quiz ? 'PUT' : 'POST',
        body: quizUpload({ title, instructions, published, release_at: releaseAt, due_at: dueAt, late_until: lateUntil, keep_file_ids: existing.map(f => f.id) }, incoming),
      });
      onSaved(result);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="quiz-card quiz-form">
    <h3>{quiz ? 'Edit Quiz' : 'Create Quiz'}</h3>
    <fieldset disabled={busy}>
      <label htmlFor={`${formId}-title`}>Quiz Title</label>
      <input id={`${formId}-title`} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
      <label htmlFor={`${formId}-instructions`}>Instructions</label>
      <textarea id={`${formId}-instructions`} maxLength={20000} value={instructions} onChange={e => setInstructions(e.target.value)} />
      <FilePicker id={`${formId}-question-files`} {...{ existing, setExisting, incoming, setIncoming }} />
      <p className="quiz-muted">All times shown in {localZone}.</p>
      <DateTimePicker id={`${formId}-release`} label="Release" value={release} onChange={setRelease} />
      <DateTimePicker id={`${formId}-due`} label="Due" value={due} onChange={setDue} />
      <label><input type="checkbox" checked={allowLate} onChange={e => setAllowLate(e.target.checked)} /> Allow late submissions</label>
      {allowLate && <DateTimePicker id={`${formId}-late`} label="Late Submission Deadline" value={late} onChange={setLate} />}
      {error && <p role="alert" className="quiz-error">{error}</p>}
      <div className="quiz-row" style={{ marginTop: 20 }}>
        {!quiz?.published && <button onClick={() => save(false)}>Save Draft</button>}
        <button className="primary" onClick={() => save(true)}>{busy ? 'Saving…' : quiz?.published ? 'Save Changes' : 'Schedule / Publish'}</button>
        <button onClick={onCancel}>Cancel</button>
        {quiz && onDeleted && <button style={{ color: '#b42318', borderColor: '#b42318', marginLeft: 'auto' }} onClick={deleteQuiz}>Delete Quiz</button>}
      </div>
    </fieldset>
  </div>;
}

export function UnitQuizzes({ unitId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    quizRequest(`/units/${unitId}`).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [unitId, revision]);
  return <div className="quiz-panel" style={{ padding: 16 }}>
    {error && <p className="quiz-error" role="alert">{error} <button onClick={() => setRevision(r => r + 1)}>Retry</button></p>}
    {!data && !error && <p>Loading quizzes…</p>}
    {data?.can_manage && !creating && <button className="primary" style={{ marginBottom: 16 }} onClick={() => setCreating(true)}>Create Quiz</button>}
    {creating && <QuizEditor unitId={unitId} onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); setRevision(r => r + 1); }} />}
    {data && !data.quizzes.length && <p className="quiz-muted">No quizzes available yet.</p>}
    {data?.quizzes.map(quiz => <div className="quiz-card" key={quiz.id}>
      <div className="quiz-row quiz-between"><h3>{quiz.title}</h3><span className="quiz-tag">{quiz.submitted ? '✓ Submitted' : quiz.status}</span></div>
      <p className="quiz-muted">Due: {displayDate(quiz.due_at)}<br />Release: {displayDate(quiz.release_at)}</p>
      <button onClick={() => navigate(`/quizzes/${quiz.id}`)}>{data.can_manage ? 'Manage Quiz' : 'Open Quiz'}</button>
    </div>)}
  </div>;
}

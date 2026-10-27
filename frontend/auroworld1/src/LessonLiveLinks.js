import { useEffect, useState } from 'react';
import { quizRequest } from './quizApi';

export default function LessonLiveLinks({ lessonId, inheritedUrl, editing, onDraftChange }) {
  const [links, setLinks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    quizRequest(`/lessons/${lessonId}/live-links`).then(data => { if (active) setLinks(Array.isArray(data) ? data : []); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [lessonId]);
  useEffect(() => { onDraftChange?.(creating); }, [creating, onDraftChange]);
  useEffect(() => { if (!editing) { setCreating(false); setTitle(''); setUrl(''); } }, [editing]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use an HTTP or HTTPS link.');
      const link = await quizRequest(`/lessons/${lessonId}/live-links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), url: url.trim() }) });
      setLinks(current => [...current, link]); setCreating(false); setTitle(''); setUrl('');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="quiz-panel" style={{ padding: 20 }}>
    {editing && !creating && <button className="primary material-add-button" onClick={() => setCreating(true)}><span className="material-add-icon" aria-hidden="true" />Add Live Link</button>}
    {editing && creating && <form className="quiz-card quiz-form" onSubmit={save}>
      <h3>Add Live Link</h3>
      <label>Link title<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>Live link URL<input required type="url" maxLength={2048} placeholder="https://zoom.us/j/..." value={url} onChange={e => setUrl(e.target.value)} /></label>
      <div className="quiz-row"><button disabled={busy} type="submit">{busy ? 'Saving...' : 'Save Link'}</button><button disabled={busy} type="button" onClick={() => { setCreating(false); setTitle(''); setUrl(''); }}>Cancel</button></div>
    </form>}
    {error && <p role="alert" className="quiz-error">{error}</p>}
    {inheritedUrl && <div className="quiz-card"><h3>Course Zoom Link</h3><p className="quiz-muted">Shared by all lessons in this course.</p><a href={inheritedUrl} target="_blank" rel="noopener noreferrer">Open Live Link</a></div>}
    {links.map(link => <div className="quiz-card" key={link.id}><h3>{link.title}</h3><a href={link.url} target="_blank" rel="noopener noreferrer">Open Live Link</a></div>)}
    {!inheritedUrl && !links.length && <p className="quiz-muted">No live links added yet.</p>}
  </div>;
}

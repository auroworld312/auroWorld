import { useEffect, useId, useState } from 'react';
import { quizRequest } from './quizApi';

export default function UnitResources({ unitId }) {
  const formId = useId();
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    setLoadError('');
    quizRequest(`/units/${unitId}/resources`).then(result => { if (active) setData(result); }).catch(e => { if (active) setLoadError(e.message); });
    return () => { active = false; };
  }, [unitId, revision]);
  async function save() {
    setError('');
    try {
      if (!editing.title.trim()) throw new Error('Enter a resource title.');
      let url;
      try { url = new URL(editing.url.trim()); } catch { throw new Error('Enter a full http:// or https:// link.'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an http:// or https:// link without embedded login details.');
      setBusy(true);
      await quizRequest(editing.id ? `/resources/${editing.id}` : `/units/${unitId}/resources`, {
        method: editing.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editing.title.trim(), url: editing.url.trim(), description: editing.description.trim() }),
      });
      setEditing(null); setRevision(r => r + 1);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function remove(resource) {
    if (!window.confirm(`Delete resource "${resource.title}"? This removes the link from this unit, not the original file or website.`)) return;
    setBusy(true); setError('');
    try {
      await quizRequest(`/resources/${resource.id}`, { method: 'DELETE' });
      if (editing?.id === resource.id) setEditing(null);
      setRevision(r => r + 1);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="quiz-panel" style={{ padding: 16 }}>
    <h3>Resources</h3>
    <p className="quiz-muted">Links to readings, files, videos and useful websites. Resources open in a new tab.</p>
    {loadError && <p role="alert" className="quiz-error">{loadError} <button onClick={() => setRevision(r => r + 1)}>Retry</button></p>}
    {!data && !loadError && <p>Loading resources…</p>}
    {data?.can_manage && !editing && <button className="primary" disabled={busy} onClick={() => { setError(''); setEditing({ title: '', url: '', description: '' }); }}>Add Resource</button>}
    {data?.can_manage && editing && <div className="quiz-card quiz-form">
      <h4>{editing.id ? 'Edit Resource' : 'Add Resource'}</h4>
      <fieldset disabled={busy}>
        <label htmlFor={`${formId}-title`}>Resource Title</label>
        <input id={`${formId}-title`} maxLength={200} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
        <label htmlFor={`${formId}-url`}>Resource Link</label>
        <input id={`${formId}-url`} type="url" maxLength={4000} placeholder="https://…" value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} />
        <label htmlFor={`${formId}-description`}>Description (optional)</label>
        <textarea id={`${formId}-description`} maxLength={5000} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
        <div className="quiz-row" style={{ marginTop: 16 }}><button className="primary" onClick={save}>{busy ? 'Saving…' : 'Save Resource'}</button><button onClick={() => { setEditing(null); setError(''); }}>Cancel</button></div>
      </fieldset>
    </div>}
    {error && <p role="alert" className="quiz-error">{error}</p>}
    {data && !data.resources.length && <p className="quiz-muted">No resources in this unit yet.</p>}
    {data?.resources.map(resource => <article className="quiz-card" key={resource.id} style={{ marginTop: 16 }}>
      <h4 style={{ marginTop: 0 }}>{resource.title}</h4>
      {resource.description && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{resource.description}</p>}
      <p className="quiz-muted" style={{ overflowWrap: 'anywhere' }}>{resource.url}</p>
      <div className="quiz-row">
        <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ color: '#5145bf', fontWeight: 600 }}>Open Resource ↗</a>
        {data.can_manage && <><button disabled={busy} onClick={() => { setError(''); setEditing({ ...resource }); }}>Edit</button><button disabled={busy} onClick={() => remove(resource)}>Delete</button></>}
      </div>
    </article>)}
  </section>;
}

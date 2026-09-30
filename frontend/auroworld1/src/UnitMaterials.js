import { useState } from 'react';
import { UnitQuizzes } from './QuizComponents';
import './CourseMaterials.css';

const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';

export default function UnitMaterials({ unit, children, initialOpen = false, initialTab = 'videos', canManage = false }) {
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(unit.title);
  const [titleDraft, setTitleDraft] = useState(unit.title);
  const [saving, setSaving] = useState(false);

  const lessonCount = unit.lessons?.length || 0;
  const videoCount = unit.lessons?.reduce((sum, lesson) => sum + (lesson.videos?.length || 0), 0) || 0;

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed) { alert('Unit name cannot be empty'); return; }
    setSaving(true);
    try {
      const response = await fetch(`${API}/edit/unit/${unit.unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitName: trimmed }),
      });
      const data = await response.json();
      if (data.mStatus !== 'ok') { alert('Renaming unit failed: ' + data.mMessage); return; }
      setTitle(trimmed);
      setEditing(false);
    } catch (error) { console.log(error.message); }
    finally { setSaving(false); }
  }

  function cancelEdit() {
    setTitleDraft(title);
    setEditing(false);
  }

  return <section className="materials-unit">
    <div className={`materials-unit-header${open ? ' is-open' : ''}`} onClick={() => !editing && setOpen(!open)}>
      <div className="materials-unit-header-left">
        <div className={`materials-icon-badge${open ? ' is-active' : ''}`}>📁</div>
        {editing ? (
          <div className="materials-inline-form" onClick={e => e.stopPropagation()}>
            <input className="materials-inline-input" value={titleDraft} onChange={e => setTitleDraft(e.target.value)} autoFocus disabled={saving} />
            <button className="materials-icon-btn" onClick={saveTitle} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="materials-icon-btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
          </div>
        ) : (
          <div className="materials-unit-title-group">
            <div className="materials-unit-title">{title}</div>
            <div className="materials-unit-subtitle">{lessonCount} lesson{lessonCount === 1 ? '' : 's'} · {videoCount} video{videoCount === 1 ? '' : 's'}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
        {!editing && canManage && (
          <button className="materials-icon-btn" onClick={() => setEditing(true)}>Rename <i className="fas fa-edit"></i></button>
        )}
        <span aria-hidden="true" className={`materials-chevron${open ? ' is-open' : ''}`}>›</span>
      </div>
    </div>
    {open && <div className="materials-unit-body" id={`unit-content-${unit.unitId}`}>
      <div className="quiz-tabs" role="tablist" aria-label={`${title} materials`} style={{ padding: 0, borderTop: 'none', marginBottom: 14 }}>
        {['videos', 'quizzes'].map(value => <button key={value} id={`unit-${unit.unitId}-${value}-tab`} role="tab" aria-selected={tab === value} aria-controls={`unit-${unit.unitId}-${value}`} onClick={() => setTab(value)}>{value === 'videos' ? `Videos (${videoCount})` : 'Quizzes'}</button>)}
      </div>
      <div role="tabpanel" id={`unit-${unit.unitId}-videos`} aria-labelledby={`unit-${unit.unitId}-videos-tab`} hidden={tab !== 'videos'}>{tab === 'videos' && children}</div>
      <div role="tabpanel" id={`unit-${unit.unitId}-quizzes`} aria-labelledby={`unit-${unit.unitId}-quizzes-tab`} hidden={tab !== 'quizzes'}>{tab === 'quizzes' && <UnitQuizzes unitId={unit.unitId} />}</div>
    </div>}
  </section>;
}
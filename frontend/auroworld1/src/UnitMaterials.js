import { useState } from 'react';
import { UnitQuizzes } from './QuizComponents';
import UnitResources from './UnitResources';
import './CourseMaterials.css';
import UnitForm from './UnitForm';

const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';

export default function UnitMaterials({ unit, children, initialOpen = false, initialTab = 'videos', canManage = false, onTitleChange, onDelete }) {
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(unit.title);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const lessonCount = unit.lessons?.length || 0;
  const videoCount = unit.lessons?.reduce((sum, lesson) => sum + (lesson.videos?.length || 0), 0) || 0;

  async function saveTitle(trimmed) {
    if (!trimmed) { alert('Unit name cannot be empty'); return; }
    if (!canManage || saving) return;
    setError('');
    setSaving(true);
    try {
      const response = await fetch(`${API}/edit/unit/${unit.unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitName: trimmed }),
      });
      const data = await response.json();
      if (data.mStatus !== 'ok') throw new Error(data.mMessage || 'Could not rename unit.');
      setTitle(trimmed);
      onTitleChange?.(trimmed);
      setEditing(false);
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  }

  function cancelEdit() {
    setError('');
    setEditing(false);
  }

  return <section className="materials-unit">
    <div className={`materials-unit-header${open ? ' is-open' : ''}`} onClick={() => !(editing && canManage) && setOpen(!open)}>
      <button type="button" className="materials-unit-header-left unit-open-button" aria-expanded={open} aria-controls={`unit-content-${unit.unitId}`} onClick={event => { event.stopPropagation(); setOpen(!open); }}>
        <div className={`materials-icon-badge${open ? ' is-active' : ''}`}><img src="/assets/courses/unit.svg" alt="" /></div>
          <div className="materials-unit-title-group">
            <div className="materials-unit-title">{title}</div>
            <div className="materials-unit-subtitle">{lessonCount} lesson{lessonCount === 1 ? '' : 's'} · {videoCount} video{videoCount === 1 ? '' : 's'}</div>
          </div>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
        {!editing && canManage && (<>
          <button className="materials-icon-btn" disabled={deleting} onClick={() => { setError(''); setEditing(true); }}>Edit</button>
          {onDelete && <button className="materials-icon-btn" style={{ color: '#dc2626' }} aria-label={`Delete ${title}`} title="Delete unit" disabled={deleting} onClick={async () => {
            setDeleting(true);
            try { await onDelete(); } finally { setDeleting(false); }
          }}>Delete</button>}
        </>)}
        <span aria-hidden="true" className={`materials-chevron${open ? ' is-open' : ''}`}>›</span>
      </div>
    </div>
    {editing && canManage && <UnitForm heading="Edit Unit" initialTitle={title} saving={saving} error={error} onSave={saveTitle} onCancel={cancelEdit} />}
    {open && <div className="materials-unit-body" id={`unit-content-${unit.unitId}`}>
      <div className="quiz-tabs" role="tablist" aria-label={`${title} materials`} style={{ padding: 0, borderTop: 'none', marginBottom: 14 }}>
        {['videos', 'quizzes', 'resources'].map(value => <button key={value} id={`unit-${unit.unitId}-${value}-tab`} role="tab" aria-selected={tab === value} aria-controls={`unit-${unit.unitId}-${value}`} onClick={() => setTab(value)}>{value === 'videos' ? `Videos (${videoCount})` : value === 'quizzes' ? 'Quizzes' : 'Resources'}</button>)}
      </div>
      <div role="tabpanel" id={`unit-${unit.unitId}-videos`} aria-labelledby={`unit-${unit.unitId}-videos-tab`} hidden={tab !== 'videos'}>{tab === 'videos' && children}</div>
      <div role="tabpanel" id={`unit-${unit.unitId}-quizzes`} aria-labelledby={`unit-${unit.unitId}-quizzes-tab`} hidden={tab !== 'quizzes'}>{tab === 'quizzes' && <UnitQuizzes unitId={unit.unitId} />}</div>
      <div role="tabpanel" id={`unit-${unit.unitId}-resources`} aria-labelledby={`unit-${unit.unitId}-resources-tab`} hidden={tab !== 'resources'}>{tab === 'resources' && <UnitResources unitId={unit.unitId} />}</div>
    </div>}
  </section>;
}

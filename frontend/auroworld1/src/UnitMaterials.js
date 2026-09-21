import { useState } from 'react';
import { UnitQuizzes } from './QuizComponents';

export default function UnitMaterials({ unit, children, initialOpen = false, initialTab = 'videos' }) {
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState(initialTab);
  return <section style={{ border: '1px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
    <button aria-expanded={open} aria-controls={`unit-content-${unit.unitId}`} onClick={() => setOpen(!open)} style={{ width: '100%', border: 0, padding: '18px 20px', background: open ? '#ede9ff' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
      <span>📁 {unit.title}</span><span aria-hidden="true">{open ? '⌄' : '›'}</span>
    </button>
    {open && <div id={`unit-content-${unit.unitId}`}>
      <div className="quiz-tabs" role="tablist" aria-label={`${unit.title} materials`}>
        {['videos', 'quizzes'].map(value => <button key={value} id={`unit-${unit.unitId}-${value}-tab`} role="tab" aria-selected={tab === value} aria-controls={`unit-${unit.unitId}-${value}`} onClick={() => setTab(value)}>{value === 'videos' ? `Videos (${unit.videos?.length || 0})` : 'Quizzes'}</button>)}
      </div>
      <div role="tabpanel" id={`unit-${unit.unitId}-videos`} aria-labelledby={`unit-${unit.unitId}-videos-tab`} hidden={tab !== 'videos'}>{tab === 'videos' && children}</div>
      <div role="tabpanel" id={`unit-${unit.unitId}-quizzes`} aria-labelledby={`unit-${unit.unitId}-quizzes-tab`} hidden={tab !== 'quizzes'}>{tab === 'quizzes' && <UnitQuizzes unitId={unit.unitId} />}</div>
    </div>}
  </section>;
}

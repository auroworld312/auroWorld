import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { displayDate, quizRequest } from './quizApi';

export function useQuizDeadlines() {
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => quizRequest('/calendar').then(data => {
      if (active) { setQuizzes(data); setError(''); }
    }).catch(e => { if (active) setError(e.message); });
    load();
    window.addEventListener('focus', load);
    const timer = setInterval(load, 60000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  return { quizzes, error };
}

export function QuizDeadlineBlocks({ quizzes, weekDates }) {
  const navigate = useNavigate();
  return quizzes.map(quiz => {
    const due = new Date(quiz.due_at);
    const index = weekDates.findIndex(date => date.toDateString() === due.toDateString());
    if (index < 0) return null;
    const atTime = quizzes.filter(q => q.due_at === quiz.due_at);
    const position = atTime.findIndex(q => q.id === quiz.id);
    return <button key={`quiz-${quiz.id}`} onClick={() => navigate(`/quizzes/${quiz.id}`)}
      title={`${quiz.title} · ${quiz.course_title} · Due ${displayDate(quiz.due_at)}`}
      style={{ position: 'absolute', top: Math.min(due.getHours() * 60 + due.getMinutes(), 1410), left: `calc(60px + ${index} * ((100% - 60px) / 7) + 2px + ${position} * ((100% - 60px) / 7 - 6px) / ${atTime.length})`, width: `calc(((100% - 60px) / 7 - 6px) / ${atTime.length})`, minHeight: 28, background: quiz.submitted ? '#1b7752' : '#a8540a', color: '#fff', border: '1px solid white', borderRadius: 5, fontSize: 11, padding: '4px', cursor: 'pointer', zIndex: 25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {quiz.submitted ? '✓' : '📝'} {quiz.title} · Due
    </button>;
  });
}

export function QuizDeadlineList({ quizzes, selectedDate, error }) {
  const navigate = useNavigate();
  const items = quizzes.filter(quiz => new Date(quiz.due_at).toDateString() === selectedDate.toDateString());
  return <div style={{ marginBottom: 16 }}>
    <h4 style={{ color: '#a8540a', marginBottom: 8 }}>Quiz Deadlines</h4>
    {error ? <p role="alert" style={{ fontSize: 13, color: '#9b2020' }}>Quiz deadlines could not load: {error}</p>
      : !items.length && <p style={{ fontSize: 13, color: '#888' }}>No quizzes due on this day.</p>}
    {items.map(quiz => <button key={quiz.id} onClick={() => navigate(`/quizzes/${quiz.id}`)} style={{ width: '100%', textAlign: 'left', padding: 12, marginBottom: 8, border: '1px solid #e0b587', borderRadius: 8, background: '#fff5e9', cursor: 'pointer' }}>
      <strong>{quiz.submitted ? '✓ ' : '📝 '}{quiz.title}</strong><br />
      <span style={{ fontSize: 12 }}>{quiz.course_title} · {quiz.unit_title}<br />Due: {displayDate(quiz.due_at)}<br />{quiz.submitted ? 'Submitted · View quiz' : 'Open quiz'}</span>
    </button>)}
  </div>;
}

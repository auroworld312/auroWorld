import { useEffect, useState } from 'react';
import { quizRequest, localZone } from './quizApi';
import './CourseSessions.css';
const localInput = value => { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const validLink = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } };

export default function CourseSessions({ course, teaching = false, onJoined, editingSessionId, onClose }) {
  const cid = course.courseId || course.course_id;
  const [data,setData] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [manage,setManage] = useState(false), [editor,setEditor] = useState(null), [form,setForm] = useState({});
  const [now,setNow] = useState(Date.now());
  const load = async () => { const result = await quizRequest(`/courses/${cid}/schedule`); setData(result); };
  useEffect(() => { let active = true; quizRequest(`/courses/${cid}/schedule`).then(d => { if(active) setData(d); }).catch(e => { if(active) setError(e.message); }); return () => { active=false; }; }, [cid]);
  useEffect(() => { const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer); },[]);
  useEffect(()=>{
    if(!data || !editingSessionId)return;
    const session=data.sessions.find(s=>String(s.id)===String(editingSessionId));
    if(session && (data.can_manage || (data.can_teach && session.teacher===data.username)))openSession(data.offerings.find(o=>o.id===session.offering_id),session);
    else setError('This session is unavailable or you cannot edit it.');
    // Open once when schedule data loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data,editingSessionId]);
  async function mutate(path,method,body) {
    setBusy(true);setError('');
    try { await quizRequest(path,{method,...(body ? {headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {})}); await load();onJoined?.();setEditor(null);if(editingSessionId)onClose?.();return true; }
    catch(e){setError(e.message);return false;} finally{setBusy(false);}
  }
  function openOffering(o) {
    setError('');setEditor({kind:'offering',id:o?.id,joining:!data.joined});
    setForm({teacher:o?.teacher || data.username,live_url:o?.live_url || (data.can_manage ? course.liveUrl : '') || '',timezone:o?.timezone || localZone,start_date:localInput(new Date()).slice(0,10),weekly_slots:[]});
  }
  function openSession(o,s) {
    setError('');setEditor({kind:'session',id:s?.id,offering:o.id});
    setForm({lesson_id:s?.lesson_id || data.lessons[0]?.lesson_id || '',teacher:s?.teacher || o.teacher,live_url:s?.live_url ?? o.live_url,starts_at:localInput(s?.starts_at),ends_at:localInput(s?.ends_at)});
  }
  async function save(e) {
    e.preventDefault();if(editor.kind==='offering' && !editor.id && !form.weekly_slots.length){setError('Choose at least one teaching day.');return;}let body={...form};
    if(editor.kind==='session') {
      body={...body,lesson_id:Number(form.lesson_id),starts_at:new Date(form.starts_at).toISOString()};
    }
    const path=editor.kind==='offering' ? (editor.id ? `/offerings/${editor.id}` : `/courses/${cid}/${editor.joining ? 'join-teaching' : 'offerings'}`) : (editor.id ? `/sessions/${editor.id}` : `/offerings/${editor.offering}/sessions`);
    await mutate(path,editor.id?'PUT':'POST',body);
  }
  const field=(name,value)=>setForm(f=>({...f,[name]:value}));
  if(!data) return <section className="sessions-panel"><p>{error || 'Loading live classes…'}</p>{error && <button onClick={()=>load().catch(e=>setError(e.message))}>Retry</button>}</section>;
  if(!data.can_access) return <p>Enroll in this course to see live classes.</p>;
  const canTeach=data.can_teach;
  const names=[...new Set([course.instructor,...data.teachers.map(t=>t.username),...data.offerings.map(o=>o.teacher)].filter(Boolean))];
  return <section className="sessions-panel" aria-label="Course live classes">
    {!editingSessionId && <header className="sessions-heading"><div><span className="course-eyebrow">{teaching?'TEACH THIS COURSE':'CHOOSE YOUR TEACHER'}</span><h2>{teaching?'Course instructors':'Choose your teacher'}</h2><p>{teaching?'Use the shared lessons and quizzes. Set your own class times and live link.':'Choose a teacher to open their live room. See class dates in Calendar.'}</p></div>
      {teaching && canTeach && <button disabled={busy || !data.lessons.length} aria-pressed={manage} onClick={()=>{if(!data.joined){setManage(true);openOffering();}else{setManage(!manage);setEditor(null);}}}>{!data.joined?'Become an instructor':manage?'Done':'Edit teaching schedule'}</button>}
    </header>}
    {error && <p role="alert" className="quiz-error">{error}</p>}
    {teaching && !data.lessons.length && <p>The course owner needs to add shared lessons before teachers can schedule classes.</p>}
    <div>
    {!editingSessionId && !editor && names.map(name=>{
      const offerings=data.offerings.filter(o=>o.teacher===name);
      const current=data.sessions.find(s=>s.teacher===name && new Date(s.starts_at)<=now && new Date(s.ends_at)>now);
      const link=validLink(current?.live_url || offerings.find(o=>validLink(o.live_url))?.live_url || data.sessions.find(s=>s.teacher===name && validLink(s.live_url))?.live_url || (name===course.instructor?course.liveUrl:''));
      return <article className="sessions-card" key={name}>
        <div className="sessions-tools"><h3>{name}</h3>{current && <span className="sessions-status is-live">Live now</span>}</div>
        {current && <p>{current.lesson_title}</p>}
        <div className="sessions-tools">
          {!teaching && (link?<a className="sessions-join" href={link} target="_blank" rel="noopener noreferrer">Open live link</a>:<span className="sessions-muted">Live link not added yet.</span>)}
          {teaching && manage && offerings.filter(o=>data.can_manage || o.teacher===data.username).map(o=><div className="sessions-tools" key={o.id}>
            <button disabled={busy} onClick={()=>openOffering(o)}>Edit live link</button>
            <button disabled={busy} onClick={()=>openSession(o)}>Add class</button>
            <button disabled={busy} onClick={()=>{if(window.confirm(`Remove the schedule for ${name}? Its calendar sessions will be removed. Shared lessons and accounts are kept.`))mutate(`/offerings/${o.id}`,'DELETE');}}>Remove schedule</button>
          </div>)}
        </div>
      </article>;
    })}
    {teaching && manage && !editor && !data.offerings.some(o=>o.teacher===data.username) && <button onClick={()=>openOffering()}>Set my class times</button>}
    {editor && <form className="sessions-editor" onSubmit={save}><h3>{editor.id?'Edit':'Add'} {editor.kind==='offering'?'teaching schedule':'session'}</h3><fieldset disabled={busy}>
      {editor.kind==='session' && <label>Lesson<select required value={form.lesson_id} onChange={e=>field('lesson_id',e.target.value)}>{data.lessons.map(l=><option key={l.lesson_id} value={l.lesson_id}>{l.unit_title} / {l.title}</option>)}</select></label>}
      <p className="sessions-muted">Instructor: <strong>{form.teacher}</strong></p>
      <label>Live link<input required type="url" maxLength={2048} placeholder="https://zoom.us/j/..." value={form.live_url} onChange={e=>field('live_url',e.target.value)}/></label>
      {editor.kind==='offering' ? <><p className="sessions-muted">Time zone: {form.timezone}{!editor.id && ' (detected from your browser)'}</p>
        {editor.id ? <p>This updates future classes using this link. Individually customized class links are kept. Change class times in Calendar.</p> : <>
          <h4>Your weekly class times</h4><p>All {data.lessons.length} lessons will be scheduled in course order, one lesson per class.</p>
          <label>Start date<input required type="date" value={form.start_date} onChange={e=>field('start_date',e.target.value)}/></label>
          <div className="sessions-weekdays">{WEEKDAYS.map((day,i)=>{
            const slot=form.weekly_slots.find(s=>s.day===i+1);
            const update=(key,value)=>field('weekly_slots',form.weekly_slots.map(s=>s.day===i+1?{...s,[key]:value}:s));
            return <div className={`sessions-weekday${slot?' selected':''}`} key={day}>
              <label className="sessions-check"><input type="checkbox" checked={!!slot} onChange={e=>field('weekly_slots',e.target.checked?[...form.weekly_slots,{day:i+1,start:'09:00'}]:form.weekly_slots.filter(s=>s.day!==i+1))}/>{day}</label>
              {slot && <div className="sessions-tools"><label>Starts<input aria-label={`${day} starts`} required type="time" value={slot.start} onChange={e=>update('start',e.target.value)}/></label></div>}
            </div>;
          })}</div>
        </>}
      </> : <><label>Starts (your local time)<input required type="datetime-local" value={form.starts_at} onChange={e=>field('starts_at',e.target.value)}/></label></>}
      <p className="sessions-muted">Class length: {data.duration_minutes || 60} minutes, following the course duration. The end time is calculated automatically.</p>
      <div className="sessions-tools"><button type="submit">{busy?'Saving…':'Save'}</button><button type="button" onClick={()=>{setEditor(null);if(editingSessionId)onClose?.();}}>Cancel</button></div>
    {editingSessionId && <button type="button" onClick={()=>{if(window.confirm('Delete this class from the calendar? The lesson is kept.'))mutate(`/sessions/${editingSessionId}`,'DELETE');}}>Delete class</button>}
    </fieldset></form>}
    {!editingSessionId && <p className="sessions-muted">All scheduled classes are available in Calendar.</p>}
    </div>
  </section>;
}

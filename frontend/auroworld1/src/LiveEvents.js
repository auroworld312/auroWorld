import { useEffect, useState, useRef } from 'react';
import { quizRequest, splitDate, dateInstant, displayDate, localZone } from './quizApi';
import './LiveEvents.css';

const localInput = value => { const d=splitDate(value); return `${d.date}T${d.time}`; };
const instant = value => { const [date,time]=value.split('T'); return dateInstant({date,time}); };
export default function LiveEvents({course={}, editingEventId, onClose, initialLevel='', fromCourse}) {
  const [level,setLevel]=useState(initialLevel);
  const [category,setCategory]=useState('');
  const [mine,setMine]=useState(false);
  const [dateFilter,setDateFilter]=useState('');
  const [data,setData]=useState(null), [error,setError]=useState(''), [form,setForm]=useState(null);
  const [busy,setBusy]=useState(false), [search,setSearch]=useState(''), [past,setPast]=useState(false);
  const [detail,setDetail]=useState(null), [now,setNow]=useState(Date.now());
  const opened=useRef(null);
  const panel=useRef(null);
  const [notice,setNotice]=useState('');
  const edit=e=>setForm({...e,starts_at:localInput(e.starts_at),ends_at:localInput(e.ends_at)});
  useEffect(()=>{
    let active=true;
    const load=()=>quizRequest('/live-events/catalog').then(d=>{
      if(!active)return;setData(d);setNow(Date.now());
    }).catch(e=>{if(active)setError(e.message);});
    load();const timer=setInterval(load,30000);window.addEventListener('focus',load);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',load);};
  },[]);
  useEffect(()=>{
    if(data && editingEventId && opened.current!==editingEventId) {
      opened.current=editingEventId;
      const e=data.events.find(e=>String(e.id)===String(editingEventId));
      if(e?.can_edit)edit(e);else setError('This event is no longer available to edit.');
    }
  },[editingEventId,data]); // Open once; background refresh must not overwrite unsaved edits.
  async function mutate(path,options) {
    setBusy(true);setError('');setNotice('');
    try {
      const saved=await quizRequest(path,options);
      // A successful write is final even if refreshing the catalog subsequently fails.
      if(saved?.id && (options.method==='POST' || options.method==='PUT')) {
        setData(previous=>({...previous,events:[...(previous?.events || []).filter(e=>String(e.id)!==String(saved.id)),{...saved,can_edit:true}].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))}));
        setSearch('');setDateFilter('');setLevel('');setCategory('');setPast(new Date(saved.ends_at)<=new Date());
      }
      setForm(null);setDetail(null);setNotice(saved?.id?'Event saved.':'Changes saved.');
      panel.current?.scrollIntoView?.({behavior:'smooth',block:'start'});
      window.dispatchEvent(new Event('live-events-changed'));
      if(editingEventId)onClose?.();
      try { setData(await quizRequest('/live-events/catalog')); }
      catch(e){setNotice('Saved successfully. The list could not refresh; reload to see the latest changes.');}
    } catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function save(e) {
    e.preventDefault();
    try {
      const body={...form,starts_at:instant(form.starts_at),ends_at:instant(form.ends_at)};
      if(new Date(body.ends_at)<=new Date(body.starts_at))throw new Error('End time must follow the start time.');
      if(new Date(body.ends_at)-new Date(body.starts_at)>86400000)throw new Error('A live event can last up to 24 hours. Ends is the end of this session, not the course end date. Please check the month and day.');
      mutate(form.id?`/live-events/${form.id}`:'/live-events',{method:form.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }catch(e){setError(e.message);}
  }
  const remove=e=>{if(window.confirm(`Delete "${e.title}"? It will be removed from the calendar for registered attendees.`))mutate(`/live-events/${e.id}`,{method:'DELETE'});};
  const filtered=(data?.events || []).filter(e=>(!level || e.level===level) && (!category || e.category===category) && (!dateFilter || splitDate(e.starts_at).date===dateFilter) && (!mine || e.registered || e.can_edit) && (past || new Date(e.ends_at)>now) && `${e.title} ${e.host_name} ${e.description}`.toLowerCase().includes(search.toLowerCase()));
  const groups=new Map();filtered.forEach(e=>{const day=new Date(e.starts_at).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});if(!groups.has(day))groups.set(day,[]);groups.get(day).push(e);});
  return <section ref={panel} className="live-events sessions-panel" aria-label="Live events">
    <header><div><span className="course-eyebrow">LIVE EVENTS</span><h2>Live Classes</h2><p>Browse the calendar and register for an event to see its details and live link.</p></div>{data?.can_create && !form && <button className="event-add" onClick={()=>setForm({title:'',description:'',host_name:'',category:'',level:'',live_url:'',starts_at:'',ends_at:''})}>+ Add event</button>}</header>
    {error && !form && <p role="alert">{error}</p>}
    {notice && !form && <p role="status">{notice}</p>}
    {!data && !error && <p role="status">Loading events...</p>}
    {form ? <form onSubmit={save} className="event-editor"><h3>{form.id?'Edit event':'Add event'}</h3><fieldset disabled={busy}>
      <label>Event title<input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Category (optional)<input placeholder="e.g. French" maxLength={100} value={form.category || ''} onChange={e=>setForm({...form,category:e.target.value})}/></label>
      <label>Level (optional)<select value={form.level || ''} onChange={e=>setForm({...form,level:e.target.value})}><option value="">All levels</option>{['Beginner','Elementary','Pre-Intermediate','Intermediate','Advanced','Proficient'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Live link<input required type="url" placeholder="https://zoom.us/j/..." value={form.live_url} onChange={e=>setForm({...form,live_url:e.target.value})}/></label>
      <div className="event-times"><label>Starts<input required type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label><label>Ends<input required type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></label></div>
      <p>Times shown in {localZone}. Set the start and end of one live session (up to 24 hours), not the date range of a course.</p>
      <label>Host name (optional)<input maxLength={200} value={form.host_name} onChange={e=>setForm({...form,host_name:e.target.value})}/></label>
      <label>Description (optional)<textarea maxLength={5000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <label><input type="checkbox" checked={!!form.cancelled} onChange={e=>setForm({...form,cancelled:e.target.checked})}/> Cancel this event (keep it visible to attendees)</label>{error && <p role="alert" className="event-save-error">{error}</p>}<div className="event-actions"><button type="submit">{busy?'Saving...':'Save event'}</button><button type="button" onClick={()=>{setForm(null);if(editingEventId)onClose?.();}}>Cancel</button>{form.id && <button type="button" onClick={()=>remove(form)}>Delete event</button>}</div>
    </fieldset></form> : <>
      {fromCourse && <p>Opened from {fromCourse}. Filters are optional; events are not restricted to this course.</p>}
      <div className="event-tools"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{[...new Set((data?.events || []).map(e=>e.category).filter(Boolean))].sort().map(v=><option key={v}>{v}</option>)}</select></label><label>Level<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">All levels</option>{[...new Set([initialLevel,...(data?.events || []).map(e=>e.level)].filter(Boolean))].sort().map(v=><option key={v}>{v}</option>)}</select></label>{(level || category) && <button onClick={()=>{setLevel('');setCategory('');}}>Show all categories and levels</button>}<button aria-pressed={!mine} onClick={()=>setMine(false)}>All events</button><button aria-pressed={mine} onClick={()=>setMine(true)}>My events</button><input aria-label="Search events" placeholder="Search events..." value={search} onChange={e=>setSearch(e.target.value)}/><label>Date<input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/></label>{dateFilter && <button onClick={()=>setDateFilter('')}>Clear date</button>}<label><input type="checkbox" checked={past} onChange={e=>setPast(e.target.checked)}/> Include past events</label></div>
      <p className="event-zone">Times shown in {localZone}</p>
      {data && !filtered.length && <p className="event-empty">{search || dateFilter || level || category?'No matching events.':'No upcoming events yet.'}</p>}
      {[...groups].map(([day,events])=><section key={day} className="event-day"><h3>{day}</h3>{events.map(e=>{
        const live=new Date(e.starts_at)<=now && new Date(e.ends_at)>now;
        return <article key={e.id} className="event-row"><span className={`event-status${live?' current':''}`}>{e.cancelled?'Cancelled':live?'Live now':new Date(e.ends_at)<=now?'Ended':'Upcoming'}</span><div className="event-name">{(e.category || e.level) && <div className="event-tags">{e.category && <span>{e.category}</span>}{e.level && <span>{e.level}</span>}</div>}<h4>{e.title}</h4>{e.host_name && <span>{e.host_name}</span>}</div><time>{new Date(e.starts_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time><div className="event-actions">{(e.registered || e.can_edit) && <button onClick={()=>setDetail(detail?.id===e.id?null:e)}>Details</button>}{e.live_url && !e.cancelled && new Date(e.ends_at)>now && <a href={e.live_url} target="_blank" rel="noopener noreferrer">Join event</a>}{!e.registered && !e.can_edit && !e.cancelled && new Date(e.ends_at)>now && <button disabled={busy} onClick={()=>mutate(`/live-events/${e.id}/register`,{method:'POST'})}>Register</button>}{e.registered && <><span>Registered</span><button disabled={busy} onClick={()=>mutate(`/live-events/${e.id}/register`,{method:'DELETE'})}>Cancel registration</button></>}{e.can_edit && <><button onClick={()=>edit(e)}>Edit</button><button disabled={busy} onClick={()=>remove(e)}>Delete</button></>}</div>{detail?.id===e.id && <div className="event-description"><p>{e.description || 'No additional details.'}</p><p>{displayDate(e.starts_at)} – {displayDate(e.ends_at)}</p></div>}</article>;
      })}</section>)}
    </>}
  </section>;
}

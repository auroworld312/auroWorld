import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const supabase = createClient(
  'https://rduempiojxizkwwbzaml.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo'
);

const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld.onrender.com';
const COURSE_COLORS = ['#6C63FF', '#8B5CF6', '#7C3AED', '#9333EA', '#A855F7', '#6D28D9', '#5B21B6'];

function parseCourseSchedule(timesStr) {
  if (!timesStr) return null;
  const s = timesStr.trim();
  const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const matches = [...s.matchAll(timePattern)];
  if (matches.length === 0) return null;
  const toTime = (m) => {
    let h = parseInt(m[1]);
    const min = m[2] ? parseInt(m[2]) : 0;
    const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { hour: h, minute: min };
  };
  const start = toTime(matches[0]);
  const end = matches.length >= 2 ? toTime(matches[1]) : { hour: start.hour + 1, minute: start.minute };
  const upper = s.toUpperCase();
  const days = new Set();
  if (upper.includes('MWF')) { days.add(1); days.add(3); days.add(5); }
  else if (upper.includes('M/W') || upper.includes('MW')) { days.add(1); days.add(3); }
  else if (upper.includes('T/TH') || upper.includes('TTH') || upper.includes('TUTH')) { days.add(2); days.add(4); }
  else {
    if (upper.includes('SU') || upper.includes('SUN')) days.add(0);
    if (upper.includes('TH') || upper.includes('R')) days.add(4);
    if (upper.includes('TU')) days.add(2);
    if (upper.includes('SA') || upper.includes('SAT')) days.add(6);
    if (upper.includes('M') && !days.has(1)) days.add(1);
    if (upper.includes('W') && !days.has(3)) days.add(3);
    if (upper.includes('F') && !days.has(5)) days.add(5);
  }
  if (days.size === 0) return null;
  return { days: [...days], startHour: start.hour, startMinute: start.minute, endHour: end.hour, endMinute: end.minute };
}

function Calendar() {
  const location = useLocation();
  const passedDate = location.state?.selectedDate ? new Date(location.state.selectedDate) : new Date();
  const [selectedDate, setSelectedDate] = useState(passedDate);
  const [panelDate, setPanelDate] = useState(passedDate);
  const [viewMode, setViewMode] = useState('day');
  const [courseEvents, setCourseEvents] = useState([]);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const scrollTo = (now.getHours() * 60 + now.getMinutes()) - 60;
      scrollRef.current.scrollTop = scrollTo > 0 ? scrollTo : 0;
    }
  }, []);

  useEffect(() => {
    async function loadEnrolledCourses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const res = await fetch(`${API}/courses/enrolled/${user.id}`);
        const data = await res.json();
        const courses = data.mData || [];
        const events = [];
        courses.forEach((course, index) => {
          const schedule = parseCourseSchedule(course.times);
          if (!schedule) return;
          events.push({
            courseId: course.courseId,
            title: course.title,
            color: COURSE_COLORS[index % COURSE_COLORS.length],
            liveUrl: course.liveUrl || null,
            instructor: course.instructor || '',
            times: course.times || '',
            days: schedule.days,
            startHour: schedule.startHour,
            startMinute: schedule.startMinute,
            endHour: schedule.endHour,
            endMinute: schedule.endMinute,
          });
        });
        setCourseEvents(events);
      } catch (e) { console.error('loadEnrolledCourses:', e); }
    }
    loadEnrolledCourses();
  }, []);

  const daysInMonth = new Date(panelDate.getFullYear(), panelDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(panelDate.getFullYear(), panelDate.getMonth(), 1).getDay();

  const handleYearClick = (year) => { setPanelDate(new Date(year, panelDate.getMonth(), 1)); setViewMode('month'); };
  const handleMonthClick = (monthIndex) => { setPanelDate(new Date(panelDate.getFullYear(), monthIndex, 1)); setViewMode('day'); };
  const handleDayClick = (day) => { const newDate = new Date(panelDate.getFullYear(), panelDate.getMonth(), day); setSelectedDate(newDate); setPanelDate(newDate); };

  const renderYearView = () => {
    const currentYear = panelDate.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
        {years.map(y => (
          <div key={y} onClick={() => handleYearClick(y)} className="calendar-day-hover"
            style={{ padding: '15px 0', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: y === selectedDate.getFullYear() ? '#6C63FF' : 'transparent',
              color: y === selectedDate.getFullYear() ? '#fff' : '#333',
              fontWeight: y === selectedDate.getFullYear() ? 'bold' : 'normal' }}>
            {y}
          </div>
        ))}
      </div>
    );
  };

  const renderMonthView = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
        {months.map((m, index) => (
          <div key={m} onClick={() => handleMonthClick(index)} className="calendar-day-hover"
            style={{ padding: '15px 0', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: index === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear() ? '#6C63FF' : 'transparent',
              color: index === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear() ? '#fff' : '#333',
              fontWeight: index === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear() ? 'bold' : 'normal' }}>
            {m}
          </div>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginTop: '10px' }}>
        {weekDays.map((d, i) => (
          <div key={'header-' + i} style={{ fontWeight: 'bold', fontSize: '12px', paddingBottom: '10px', color: '#6C63FF' }}>{d}</div>
        ))}
        {blanks.map(b => <div key={'blank-' + b} />)}
        {days.map(d => {
          const isSelected = d === selectedDate.getDate() && panelDate.getMonth() === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear();
          return (
            <div key={d} onClick={() => handleDayClick(d)} className="calendar-day-hover"
              style={{ width: '30px', height: '30px', lineHeight: '30px', margin: '0 auto', borderRadius: '50%', cursor: 'pointer', fontSize: '14px',
                backgroundColor: isSelected ? '#6C63FF' : 'transparent',
                color: isSelected ? '#fff' : '#333',
                fontWeight: isSelected ? 'bold' : 'normal' }}>
              {d}
            </div>
          );
        })}
      </div>
    );
  };

  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return '12 AM';
    if (i < 12) return i + ' AM';
    if (i === 12) return '12 PM';
    return (i - 12) + ' PM';
  });

  const getEventBlocks = () => {
    const blocks = [];
    courseEvents.forEach(event => {
      weekDates.forEach((date, dayIndex) => {
        const dow = date.getDay();
        if (event.days.includes(dow)) {
          const topPx = event.startHour * 60 + event.startMinute;
          const heightPx = (event.endHour * 60 + event.endMinute) - topPx;
          blocks.push({ ...event, dayIndex, topPx, heightPx, date });
        }
      });
    });
    return blocks;
  };

  const eventBlocks = getEventBlocks();

  const formatTime = (hour, minute) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const m = minute.toString().padStart(2, '0');
    const ap = hour >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${ap}`;
  };

  const selectedDayEvents = courseEvents.filter(e => e.days.includes(selectedDate.getDay()));
  const monthName = panelDate.toLocaleString('en-US', { month: 'long' });

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#E3C7E6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontSize: '16px', color: '#111' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '20px', gap: '20px' }}>

          {/* Weekly grid */}
          <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 10px rgba(108,99,255,0.10)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #EDE9FF', padding: '10px 0' }}>
              <div style={{ width: '60px' }}></div>
              {weekDates.map((date, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6C63FF', fontWeight: 'bold' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px', color: '#333' }}>{date.getDate()}</div>
                </div>
              ))}
            </div>

            <div ref={scrollRef} className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {hours.map((time, i) => (
                <div key={i} style={{ display: 'flex', borderBottom: '1px solid #F3F0FF', height: '60px' }}>
                  <div style={{ width: '60px', textAlign: 'center', fontSize: '11px', color: '#9CA3AF', paddingTop: '5px', borderRight: '1px solid #EDE9FF' }}>
                    {time}
                  </div>
                  {weekDates.map((_, dayIndex) => (
                    <div key={dayIndex} style={{ flex: 1, borderRight: '1px solid #F3F0FF' }}></div>
                  ))}
                </div>
              ))}

              {eventBlocks.map((event, idx) => (
                <div
                  key={`${event.courseId}-${event.dayIndex}-${idx}`}
                  onClick={() => event.liveUrl && window.open(event.liveUrl, '_blank')}
                  onMouseEnter={() => setHoveredEvent({ ...event, idx })}
                  onMouseLeave={() => setHoveredEvent(null)}
                  style={{
                    position: 'absolute',
                    top: event.topPx + 'px',
                    left: `calc(60px + ${event.dayIndex} * ((100% - 60px) / 7) + 2px)`,
                    width: 'calc((100% - 60px) / 7 - 6px)',
                    height: Math.max(event.heightPx, 24) + 'px',
                    backgroundColor: event.color,
                    borderRadius: '6px',
                    padding: '4px 6px',
                    color: 'white',
                    fontSize: '11px',
                    overflow: 'visible',
                    zIndex: hoveredEvent?.courseId === event.courseId && hoveredEvent?.dayIndex === event.dayIndex ? 20 : 10,
                    cursor: event.liveUrl ? 'pointer' : 'default',
                    boxSizing: 'border-box',
                    boxShadow: `0 2px 6px ${event.color}66`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.9 }}>
                    {formatTime(event.startHour, event.startMinute)} – {formatTime(event.endHour, event.endMinute)}
                  </div>

                  {hoveredEvent?.courseId === event.courseId && hoveredEvent?.dayIndex === event.dayIndex && (
                    <div style={{
                      position: 'absolute', top: '0px', left: 'calc(100% + 8px)', width: '220px',
                      backgroundColor: event.color, borderRadius: '12px', padding: '14px',
                      boxShadow: '0 8px 24px rgba(108,99,255,0.25)', zIndex: 100, color: '#fff', pointerEvents: 'none',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', lineHeight: 1.3 }}>{event.title}</div>
                      <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '4px' }}>Instructor: {event.instructor || '—'}</div>
                      <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '4px' }}>Times: {event.times || '—'}</div>
                      <div style={{ fontSize: '12px', opacity: 0.85 }}>{formatTime(event.startHour, event.startMinute)} – {formatTime(event.endHour, event.endMinute)}</div>
                      {event.liveUrl && <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '700', opacity: 0.9 }}>Click to join ↗</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'flex', backgroundColor: '#D4C5F9', borderRadius: '20px', padding: '4px' }}>
              {['Year', 'Month', 'Day'].map(mode => (
                <div key={mode} onClick={() => setViewMode(mode.toLowerCase())}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: '16px', fontSize: '14px', cursor: 'pointer', fontWeight: '600',
                    backgroundColor: viewMode === mode.toLowerCase() ? '#6C63FF' : 'transparent',
                    color: viewMode === mode.toLowerCase() ? 'white' : '#5B21B6',
                    transition: 'all 0.2s' }}>
                  {mode}
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(108,99,255,0.10)' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '15px', textAlign: 'center', color: '#6C63FF' }}>
                {viewMode === 'day' && monthName + ' ' + panelDate.getFullYear()}
                {viewMode === 'month' && panelDate.getFullYear()}
                {viewMode === 'year' && 'Select Year'}
              </div>
              {viewMode === 'year' && renderYearView()}
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'day' && renderDayView()}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(108,99,255,0.10)', flex: 1, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800', color: '#6C63FF' }}>My Schedule</h3>

              {viewMode !== 'day' && (
                <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', marginTop: '30px' }}>
                  Please select a day to view your schedule.
                </div>
              )}

              {viewMode === 'day' && selectedDayEvents.length === 0 && (
                <div style={{ backgroundColor: '#F3F0FF', padding: '15px', borderRadius: '10px', fontSize: '14px', color: '#7C3AED' }}>
                  No classes on this day.
                </div>
              )}

              {viewMode === 'day' && selectedDayEvents.map(event => (
                <div key={event.courseId}
                  onClick={() => event.liveUrl && window.open(event.liveUrl, '_blank')}
                  style={{ backgroundColor: event.color + '18', border: `1.5px solid ${event.color}`,
                    padding: '12px 15px', borderRadius: '10px', fontSize: '14px',
                    cursor: event.liveUrl ? 'pointer' : 'default', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 'bold', color: event.color }}>{event.title}</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#555' }}>
                    {formatTime(event.startHour, event.startMinute)} – {formatTime(event.endHour, event.endMinute)}
                  </div>
                  {event.liveUrl && <div style={{ fontSize: '12px', color: event.color, marginTop: '2px' }}>Click to join</div>}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Calendar;
import React, { useState, useEffect } from 'react';

function MiniCalendar({ selectedDate: propDate, onDateChange }) {
  const [selectedDate, setSelectedDate] = useState(propDate || new Date());
  const [panelDate, setPanelDate] = useState(propDate || new Date());
  const [viewMode, setViewMode] = useState('day');

  useEffect(() => {
    if (propDate) {
      setSelectedDate(propDate);
      setPanelDate(propDate);
    }
  }, [propDate]);

  const daysInMonth = new Date(panelDate.getFullYear(), panelDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(panelDate.getFullYear(), panelDate.getMonth(), 1).getDay();

  const handleYearClick = (year) => {
    setPanelDate(new Date(year, panelDate.getMonth(), 1));
    setViewMode('month');
  };

  const handleMonthClick = (monthIndex) => {
    setPanelDate(new Date(panelDate.getFullYear(), monthIndex, 1));
    setViewMode('day');
  };

  const handleDayClick = (day) => {
    const newDate = new Date(panelDate.getFullYear(), panelDate.getMonth(), day);
    setSelectedDate(newDate);
    setPanelDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const renderYearView = () => {
    const currentYear = panelDate.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
        {years.map(y => (
          <div
            key={y}
            onClick={() => handleYearClick(y)}
            className="calendar-day-hover"
            style={{ 
              padding: '15px 0', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              backgroundColor: y === selectedDate.getFullYear() ? '#333' : 'transparent', 
              color: y === selectedDate.getFullYear() ? '#fff' : '#333',
              fontWeight: y === selectedDate.getFullYear() ? 'bold' : 'normal',
              transition: 'background-color 0.2s'
            }}
          >
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
          <div
            key={m}
            onClick={() => handleMonthClick(index)}
            className="calendar-day-hover"
            style={{ 
              padding: '15px 0', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              backgroundColor: index === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear() ? '#333' : 'transparent', 
              color: index === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear() ? '#fff' : '#333',
              fontWeight: index === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear() ? 'bold' : 'normal',
              transition: 'background-color 0.2s'
            }}
          >
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
          <div key={`header-${i}`} style={{ fontWeight: 'bold', fontSize: '12px', paddingBottom: '10px', color: '#888' }}>{d}</div>
        ))}
        {blanks.map(b => <div key={`blank-${b}`} />)}
        {days.map(d => {
          const isSelected = d === selectedDate.getDate() && panelDate.getMonth() === selectedDate.getMonth() && panelDate.getFullYear() === selectedDate.getFullYear();
          return (
            <div
              key={d}
              onClick={() => handleDayClick(d)}
              className="calendar-day-hover"
              style={{
                width: '32px', height: '32px', lineHeight: '32px', margin: '0 auto', borderRadius: '50%', cursor: 'pointer', fontSize: '14px',
                backgroundColor: isSelected ? '#333' : 'transparent',
                color: isSelected ? '#fff' : '#333',
                fontWeight: isSelected ? 'bold' : 'normal',
                transition: 'background-color 0.2s'
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ display: 'flex', backgroundColor: '#e0e0e0', borderRadius: '25px', padding: '4px' }}>
        {['Year', 'Month', 'Day'].map(mode => (
          <div
            key={mode}
            onClick={() => setViewMode(mode.toLowerCase())}
            className="calendar-day-hover"
            style={{
              flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold',
              backgroundColor: viewMode === mode.toLowerCase() ? '#666' : 'transparent',
              color: viewMode === mode.toLowerCase() ? 'white' : '#666',
              transition: 'all 0.2s'
            }}
          >
            {mode}
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center', color: '#111' }}>
          {viewMode === 'day' && `${panelDate.toLocaleString('default', { month: 'long' })} ${panelDate.getFullYear()}`}
          {viewMode === 'month' && panelDate.getFullYear()}
          {viewMode === 'year' && 'Select Year'}
        </div>
        
        {viewMode === 'year' && renderYearView()}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold', color: '#111' }}>My Schedule</h3>
        
        {viewMode === 'day' ? (
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '10px', fontSize: '14px', color: '#555' }}>
            job of day "{selectedDate.getDate()}"
          </div>
        ) : (
          <div style={{ color: '#999', fontSize: '14px', textAlign: 'center', marginTop: '20px', paddingBottom: '10px' }}>
            Please select a day to view your schedule.
          </div>
        )}
      </div>

    </div>
  );
}

export default MiniCalendar;
// RFC 5545 text escaping prevents event text from creating extra calendar fields.
const escapeText = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const timestamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
export function eventCalendar(event) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Auroworld//Live Events//EN', 'BEGIN:VEVENT',
    `UID:live-event-${event.id}@auroworld`, `DTSTAMP:${timestamp(new Date())}`,
    `DTSTART:${timestamp(event.starts_at)}`, `DTEND:${timestamp(event.ends_at)}`,
    `SUMMARY:${escapeText(event.title)}`, `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.live_url)}`, `STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT', 'END:VCALENDAR'];
  // Fold long content lines at UTF-8 byte boundaries for calendar app compatibility.
  return lines.map(line => {
    let out = '', width = 0;
    for (const char of line) {
      const bytes = unescape(encodeURIComponent(char)).length;
      if (width + bytes > 75) { out += '\r\n '; width = 1; }
      out += char; width += bytes;
    }
    return out;
  }).join('\r\n') + '\r\n';
}
export function downloadEventCalendar(event) {
  const url = URL.createObjectURL(new Blob([eventCalendar(event)], {type:'text/calendar;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = `auroworld-event-${event.id}.ics`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

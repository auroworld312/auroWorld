import { eventCalendar } from './eventCalendar';
test('exports absolute times and escapes user content', () => {
  const text = eventCalendar({id:42, title:'French, beginner; class', description:'Line one\nBEGIN:VEVENT', starts_at:'2026-11-24T10:00:00-05:00', ends_at:'2026-11-24T11:00:00-05:00', live_url:'https://example.com/live'});
  expect(text).toContain('DTSTART:20261124T150000Z');
  expect(text).toContain('DTEND:20261124T160000Z');
  expect(text).toContain('SUMMARY:French\\, beginner\\; class');
  expect(text).toContain('DESCRIPTION:Line one\\nBEGIN:VEVENT');
  expect(text.match(/^BEGIN:VEVENT/gm)).toHaveLength(1);
});

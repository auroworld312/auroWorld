import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rduempiojxizkwwbzaml.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo'
);
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';

export async function quizRequest(path, options = {}, blob = false) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please log in to view quizzes.');
  const response = await fetch(`${API}/quiz-api${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}` },
  });
  if (blob && response.ok) return response.blob();
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.mStatus !== 'ok') throw new Error(data?.mMessage || 'The request failed. Please try again.');
  return data.mData;
}

export function quizUpload(metadata, files) {
  const body = new FormData();
  body.append('metadata', JSON.stringify(metadata));
  files.forEach(file => body.append('files', file));
  return body;
}

export const FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp';
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2), m = i % 2 ? '30' : '00';
  return { value: `${String(h).padStart(2, '0')}:${m}`, label: `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}` };
});
export const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function displayDate(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';
}
export function splitDate(value) {
  if (!value) return { date: '', time: '' };
  const d = new Date(value), pad = n => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
export function dateInstant(value) {
  if (!value.date && !value.time) return null;
  if (!value.date || !value.time) throw new Error('Select both a date and a time.');
  const d = new Date(`${value.date}T${value.time}:00`);
  if (Number.isNaN(d.getTime()) || splitDate(d.toISOString()).time !== value.time || splitDate(d.toISOString()).date !== value.date) {
    throw new Error('This local time is unavailable. Please choose another time.');
  }
  return d.toISOString();
}
export function validateFiles(existing, incoming) {
  if (existing.length + incoming.length > 5) throw new Error('Use at most 5 files.');
  for (const file of incoming) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!FILE_ACCEPT.split(',').includes(ext)) throw new Error(`Unsupported file: ${file.name}`);
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Each file must be nonempty and no larger than 10 MB.');
  }
  if ([...existing, ...incoming].reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) throw new Error('Attachments must total no more than 30 MB.');
}

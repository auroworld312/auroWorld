import { useState } from 'react';
import { useUser } from '../UserContext';

export default function UserAvatar({ size = 40 }) {
  const { displayName, email, avatarUrl } = useUser();
  const [failedUrl, setFailedUrl] = useState(null);
  const name = displayName || email || 'Guest';
  const parts = name.trim().split(/\s+/);
  const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name[0]).toUpperCase();
  let hash = 0;
  for (const char of email || '') hash = char.charCodeAt(0) + ((hash << 5) - hash);
  const color = ['#6C63FF', '#FF6584', '#43B89C', '#F6B93B', '#E55039', '#2E86AB'][Math.abs(hash) % 6];
  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' };
  return avatarUrl && avatarUrl !== failedUrl
    ? <img src={avatarUrl} alt="" style={style} onError={() => setFailedUrl(avatarUrl)} />
    : <span aria-hidden="true" style={{ ...style, background: color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .38, fontWeight: 700 }}>{initials}</span>;
}

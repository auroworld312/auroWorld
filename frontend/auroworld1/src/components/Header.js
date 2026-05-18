import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';

function Header() {
  const navigate = useNavigate();
  const { displayName, email, avatarUrl } = useUser();
  const headerName = displayName || email || 'Guest';

  function getInitials() {
    const parts = headerName.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return headerName[0]?.toUpperCase() || '?';
  }

  function getAvatarColor() {
    const colors = ['#6C63FF', '#FF6584', '#43B89C', '#F6B93B', '#E55039', '#2E86AB'];
    const str = email || '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  return (
    <div style={{
      height: '70px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#ffffff',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: '0 40px'
    }}>
      <div
        onClick={() => navigate('/profile')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: getAvatarColor(),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '700', color: '#fff',
          }}>
            {getInitials()}
          </div>
        )}
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{headerName}</span>
        <span style={{ fontSize: '16px' }}>⌄</span>
      </div>
    </div>
  );
}

export default Header;
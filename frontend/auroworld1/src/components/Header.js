import UserAvatar from './UserAvatar';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';

function Header() {
  const navigate = useNavigate();
  const { displayName, email } = useUser();
  const headerName = displayName || email || 'Guest';

  return (
    <div style={{
      height: '70px',
      flexShrink: 0,
      borderBottom: '1px solid #2e1a48',
      backgroundColor: '#2e1a48',
      color: '#ffffff',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: '0 40px'
    }}>
      <div
        onClick={() => navigate('/profile')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <UserAvatar />
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{headerName}</span>
        <span style={{ fontSize: '16px' }}>⌄</span>
      </div>
    </div>
  );
}

export default Header;

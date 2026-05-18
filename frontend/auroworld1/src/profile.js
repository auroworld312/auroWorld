import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useAccessibility } from './AccessibilityContext.js';
import { useUser } from './UserContext.js';

const supabase = createClient(
  'https://rduempiojxizkwwbzaml.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo'
);

function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [username, setUsername] = useState('');

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editUsername, setEditUsername] = useState('');

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const { contrast, setContrast, textSize, setTextSize, boldText, setBoldText } = useAccessibility();
  const { setDisplayName, avatarUrl, setAvatarUrl } = useUser();

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const currentEmail = user.email || '';
      setEmail(currentEmail);

      const { data: userData } = await supabase
        .from('users')
        .select('firstname, lastname, username')
        .eq('email', currentEmail);

      console.log('userData:', userData);

      if (userData && userData.length > 0) {
        const fn = userData[0].firstname || '';
        const ln = userData[0].lastname || '';
        const un = userData[0].username || '';
        setFirstName(fn);
        setLastName(ln);
        setUsername(un);
        setEditFirstName(fn);
        setEditLastName(ln);
        setEditUsername(un);
      }

      const { data: profileData } = await supabase
        .from('profile_attributes')
        .select('birthday, note')
        .eq('email', currentEmail);

      console.log('profileData:', profileData);

      if (profileData && profileData.length > 0) {
        if (profileData[0].birthday) {
          const bd = profileData[0].birthday;
          setBirthdate(bd);
          setEditBirthdate(bd);
        }
        if (profileData[0].note) {
          setAvatarUrl(profileData[0].note);
        }
      }

      setLoading(false);
    }
    loadProfile();
  }, [navigate, setAvatarUrl]);

  function getInitials() {
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (username) return username[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
  }

  function getAvatarColor() {
    const colors = ['#6C63FF', '#FF6584', '#43B89C', '#F6B93B', '#E55039', '#2E86AB'];
    const str = email || username || '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingAvatar(false); return; }

    const ext = file.name.split('.').pop();
    const fileName = `${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('avatar upload error:', uploadError);
      alert('Failed to upload avatar: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    const { data: existingProfile } = await supabase
      .from('profile_attributes')
      .select('email')
      .eq('email', user.email);

    if (existingProfile && existingProfile.length > 0) {
      await supabase
        .from('profile_attributes')
        .update({ note: publicUrl })
        .eq('email', user.email);
    } else {
      await supabase
        .from('profile_attributes')
        .insert({ uuid: user.id, email: user.email, username: username || user.email.split('@')[0], note: publicUrl });
    }

    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', user.email);

    if (existingUser && existingUser.length > 0) {
      const { error } = await supabase
        .from('users')
        .update({ firstname: editFirstName, lastname: editLastName, username: editUsername })
        .eq('email', user.email);
      if (error) {
        console.error('update users error:', error);
        alert('Failed to save profile: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('users')
        .insert({ email: user.email, firstname: editFirstName, lastname: editLastName, username: editUsername || user.email.split('@')[0], role: 'user' });
      if (error) {
        console.error('insert users error:', error);
        alert('Failed to save profile: ' + error.message);
        setSaving(false);
        return;
      }
    }

    const { data: existingProfile } = await supabase
      .from('profile_attributes')
      .select('email')
      .eq('email', user.email);

    if (existingProfile && existingProfile.length > 0) {
      const { error } = await supabase
        .from('profile_attributes')
        .update({ birthday: editBirthdate })
        .eq('email', user.email);
      if (error) {
        console.error('update profile error:', error);
        alert('Failed to save birthday: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('profile_attributes')
        .insert({ uuid: user.id, email: user.email, username: editUsername || user.email.split('@')[0], birthday: editBirthdate });
      if (error) {
        console.error('insert profile error:', error);
        alert('Failed to save birthday: ' + error.message);
        setSaving(false);
        return;
      }
    }

    setFirstName(editFirstName);
    setLastName(editLastName);
    setBirthdate(editBirthdate);
    setUsername(editUsername);

    const newName = editFirstName
      ? editFirstName + (editLastName ? ' ' + editLastName : '')
      : editUsername || user.email || '';
    setDisplayName(newName);

    setSaving(false);
    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditBirthdate(birthdate);
    setEditUsername(username);
  }

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordSuccess('');
    if (!newPassword) { setPasswordError('Password cannot be empty.'); return; }
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    if (/\s/.test(newPassword)) { setPasswordError('Password cannot contain spaces.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setShowPasswordSection(false); setPasswordSuccess(''); }, 2000);
    }
  }

  const fieldStyle = { borderBottom: '1px solid #f0f0f0', paddingBottom: '20px', marginBottom: '20px' };
  const labelStyle = { fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const valueStyle = { fontSize: '16px', fontWeight: '500', color: '#111' };
  const inputStyle = { fontSize: '15px', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' };

  const contrastOptions = [
    { key: 'readable', label: 'Aa', sub: 'Readable' },
    { key: 'good', label: 'Aa Aa', sub: 'Good Contrast' },
    { key: 'high', label: 'Aa Aa Aa', sub: 'High Contrast' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#aaa' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <div style={{ fontSize: '15px' }}>Loading your profile...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', backgroundColor: '#f0f2f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#111',
    }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />

        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>Settings</h1>
            <div style={{ display: 'flex', backgroundColor: '#e4e4e4', borderRadius: '10px', padding: '4px' }}>
              {['profile', 'accessibility'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                    backgroundColor: activeTab === tab ? '#222' : 'transparent',
                    color: activeTab === tab ? '#fff' : '#666',
                  }}
                >
                  {tab === 'profile' ? 'My Profile' : 'Accessibility'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {saveSuccess && (
                <div style={{
                  backgroundColor: '#e6f9f0', border: '1px solid #b2dfdb',
                  borderRadius: '10px', padding: '12px 20px',
                  color: '#2e7d62', fontWeight: '600', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  Profile updated successfully!
                </div>
              )}

              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="avatar"
                          style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                        />
                      ) : (
                        <div style={{
                          width: '84px', height: '84px', borderRadius: '50%',
                          backgroundColor: getAvatarColor(),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '32px', fontWeight: '700', color: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}>
                          {getInitials()}
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: '26px', height: '26px', borderRadius: '50%',
                        backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '300', color: '#333', border: '1.5px solid #ccc',
                      }}>
                        {uploadingAvatar ? '···' : '+'}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAvatarUpload}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#111' }}>
                        {firstName && lastName
                          ? `${firstName} ${lastName}`
                          : firstName || username || email.split('@')[0]}
                      </div>
                      {username && (
                        <div style={{ fontSize: '14px', color: '#888', marginTop: '2px' }}>@{username}</div>
                      )}
                      <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>{email}</div>
                    </div>
                  </div>

                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 20px', borderRadius: '10px',
                        border: '1.5px solid #e0e0e0', backgroundColor: '#fff',
                        cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                      }}
                    >
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          padding: '10px 22px', borderRadius: '10px', border: 'none',
                          backgroundColor: saving ? '#999' : '#222', color: '#fff',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          fontWeight: '600', fontSize: '14px',
                        }}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: '10px 20px', borderRadius: '10px',
                          border: '1.5px solid #e0e0e0', backgroundColor: '#fff',
                          cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 60px' }}>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>First Name</div>
                    {isEditing
                      ? <input style={inputStyle} value={editFirstName} onChange={e => setEditFirstName(e.target.value)} placeholder="Enter first name" />
                      : <div style={valueStyle}>{firstName || <span style={{ color: '#bbb' }}>Not set</span>}</div>}
                  </div>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Last Name</div>
                    {isEditing
                      ? <input style={inputStyle} value={editLastName} onChange={e => setEditLastName(e.target.value)} placeholder="Enter last name" />
                      : <div style={valueStyle}>{lastName || <span style={{ color: '#bbb' }}>Not set</span>}</div>}
                  </div>
                </div>

                <div style={fieldStyle}>
                  <div style={labelStyle}>Username</div>
                  {isEditing
                    ? <input style={{ ...inputStyle, maxWidth: '320px' }} value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Enter username" />
                    : <div style={valueStyle}>{username ? `@${username}` : <span style={{ color: '#bbb' }}>Not set</span>}</div>}
                </div>

                <div style={fieldStyle}>
                  <div style={labelStyle}>Date of Birth</div>
                  {isEditing
                    ? <input type="date" style={{ ...inputStyle, maxWidth: '220px' }} value={editBirthdate} onChange={e => setEditBirthdate(e.target.value)} />
                    : <div style={valueStyle}>{birthdate
                        ? new Date(birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : <span style={{ color: '#bbb' }}>Not set</span>}
                      </div>}
                </div>

                <div style={fieldStyle}>
                  <div style={labelStyle}>Email Address</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={valueStyle}>{email}</div>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', color: '#2e7d62',
                      backgroundColor: '#e6f9f0', padding: '2px 8px', borderRadius: '20px',
                    }}>Verified</span>
                  </div>
                </div>

                <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={labelStyle}>Password</div>
                    <button
                      onClick={() => { setShowPasswordSection(v => !v); setPasswordError(''); setPasswordSuccess(''); }}
                      style={{ fontSize: '13px', color: '#6C63FF', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {showPasswordSection ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>

                  {!showPasswordSection && (
                    <div style={{ ...valueStyle, letterSpacing: '3px', color: '#555' }}>••••••••••••</div>
                  )}

                  {showPasswordSection && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                      <div>
                        <div style={labelStyle}>New Password</div>
                        <input type="password" style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
                      </div>
                      <div>
                        <div style={labelStyle}>Confirm New Password</div>
                        <input type="password" style={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                      </div>
                      {passwordError && <div style={{ color: '#e53935', fontSize: '13px', fontWeight: '600' }}>⚠️ {passwordError}</div>}
                      {passwordSuccess && <div style={{ color: '#2e7d62', fontSize: '13px', fontWeight: '600' }}>{passwordSuccess}</div>}
                      <button
                        onClick={handleChangePassword}
                        style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', backgroundColor: '#222', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', alignSelf: 'flex-start' }}
                      >
                        Update Password
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>

              <div style={{ paddingBottom: '36px', borderBottom: '1px solid #f0f0f0', marginBottom: '36px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#111' }}>Contrast</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  {contrastOptions.map(opt => (
                    <div
                      key={opt.key}
                      onClick={() => setContrast(opt.key)}
                      style={{
                        padding: '20px 32px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                        border: contrast === opt.key ? '2px solid #222' : '2px solid transparent',
                        backgroundColor: contrast === opt.key ? '#222' : '#f4f4f4',
                        color: contrast === opt.key ? '#fff' : '#333',
                        minWidth: '120px', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: '700' }}>{opt.label}</div>
                      <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.75 }}>{opt.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingBottom: '36px', borderBottom: '1px solid #f0f0f0', marginBottom: '36px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#111' }}>Text Size</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#999' }}>Small</span>
                  <input
                    type="range" min="1" max="5" value={textSize}
                    onChange={e => setTextSize(Number(e.target.value))}
                    style={{ width: '300px', cursor: 'pointer', accentColor: '#222' }}
                  />
                  <span style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>Big</span>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#111' }}>Bold Text</div>
                <div style={{ display: 'inline-flex', backgroundColor: '#f0f0f0', borderRadius: '10px', padding: '4px' }}>
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      onClick={() => setBoldText(val)}
                      style={{
                        padding: '8px 30px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                        backgroundColor: boldText === val ? '#222' : 'transparent',
                        color: boldText === val ? '#fff' : '#666',
                      }}
                    >
                      {val ? 'On' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Profile;
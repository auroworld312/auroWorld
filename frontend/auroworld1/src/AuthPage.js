import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from './utils/supabaseClient';
import { quizRequest } from './quizApi';
import { useUser } from './UserContext';
import './auth.css';

export default function AuthPage({ signup = false }) {
  const navigate = useNavigate();
  const { refreshUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState(false);
  const [reset, setReset] = useState(false);
  async function initialize(details = {}) {
    const result = await quizRequest('/account/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) });
    if (!result.ready) { setSetup(true); return; }
    await refreshUser();
    navigate('/posts');
  }
  async function run(action) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) { setError(e.message || 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    await run(async () => {
      if (setup) { await initialize({ username: username.trim(), role }); return; }
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/resetpass` });
        if (error) throw error;
        setNotice('Check your email for a password reset link.'); return;
      }
      if (signup) {
        if (password !== confirm) throw new Error('Passwords must match.');
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
          options: { data: { signup_username: username.trim(), signup_role: role } } });
        if (error) throw error;
        if (!data.session) { setNotice('Check your email to confirm your account, then sign in to finish setup.'); return; }
        await initialize({ username: username.trim(), role });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const meta = data.user?.user_metadata || {};
        // Existing roles are always preserved by the server. Metadata is only a new-account preference.
        await initialize(['user', 'instructor'].includes(meta.signup_role) && meta.signup_username
          ? { username: meta.signup_username, role: meta.signup_role } : {});
      }
    });
  }
  const title = setup ? 'Complete your account' : reset ? 'Reset your password.' : signup ? 'Create an account' : 'Welcome back.';
  return <main className="auth-page">
    <aside className="auth-story">
      <Link to="/login" className="auth-brand"><img src="/assets/sidebar/language.svg" alt="" /> auroworld</Link>
      <div className="auth-story-copy">
        <h1>Your courses,<br />all in one place.</h1>
        <p>Find your classes, course materials and assignments on auroworld.</p>
      </div>
    </aside>
    <section className="auth-main"><div className="auth-panel">
      <h2>{title}</h2><p className="auth-subtitle">{setup || signup ? 'Choose how you would like to take part.' : reset ? 'We will send a reset link to your email.' : 'Sign in to pick up where you left off.'}</p>
      {error && <div className="auth-message auth-error" role="alert">{error}</div>}
      {notice && <div className="auth-message" role="status">{notice}</div>}
      <form onSubmit={submit}><fieldset disabled={busy}>
        {(signup || setup) && !reset && <><label htmlFor="auth-username">Username</label><input id="auth-username" value={username} onChange={e => setUsername(e.target.value)} pattern="[A-Za-z0-9_]{5,30}" title="5-30 letters, numbers or underscores" required autoComplete="username" />
          <div className="auth-role-label" id="role-label">I am joining as a</div><div className="auth-roles" role="group" aria-labelledby="role-label">{[['user', 'Student', 'Explore courses and learn'], ['instructor', 'Teacher', 'Create courses and teach']].map(([value, label, hint]) => <label className={role === value ? 'selected' : ''} key={value}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} /><strong>{label}</strong><small>{hint}</small></label>)}</div><p className="auth-hint">Your role is selected once when you create your account.</p></>}
        {!setup && <><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          {!reset && <><label htmlFor="auth-password">Password</label><div className="auth-password"><input id="auth-password" type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 6 : undefined} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button></div>
          {signup && <><label htmlFor="auth-confirm">Confirm password</label><input id="auth-confirm" type={visible ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required /></>}
          {!signup && <button className="auth-forgot" type="button" onClick={() => { setReset(true); setError(''); }}>Forgot password?</button>}</>}
        </>}
        <button className="auth-primary" type="submit">{busy ? 'Please wait...' : setup ? 'Complete account' : reset ? 'Send reset link' : signup ? 'Create account' : 'Sign in'}</button>
      </fieldset></form>
      {!setup && !reset && <><div className="auth-divider"><span>or continue with</span></div><div className="auth-google" aria-disabled={busy} style={busy ? { pointerEvents: 'none', opacity: .6 } : undefined}><GoogleLogin onSuccess={credential => run(async () => {
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential.credential });
        if (error) throw error;
        await initialize();
      })} onError={() => setError('Google sign-in failed. Please try again.')} shape="pill" size="large" /></div></>}
      <p className="auth-switch">{setup ? <button onClick={() => run(async () => { await supabase.auth.signOut(); setSetup(false); })}>Back to sign in</button> : reset ? <button onClick={() => { setReset(false); setError(''); setNotice(''); }}>Back to sign in</button> : signup ? <>Already a member? <Link to="/login">Sign in</Link></> : <>New to auroworld? <Link to="/signup">Create an account</Link></>}</p>
    </div></section>
  </main>;
}

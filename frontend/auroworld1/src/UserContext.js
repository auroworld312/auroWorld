import { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { createClient } from '@supabase/supabase-js';
// import { useLocation} from "react-router-dom";
import {supabase} from './utils/supabaseClient.js'

// const supabase = createClient(
//   'https://rduempiojxizkwwbzaml.supabase.co',
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo'
// );
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com'

const UserContext = createContext();

export function UserProvider({ children }) {

  // const {state} = useLocation()
  // const {passedUserId} = state || {}

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null)

  const refreshUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDisplayName(''); setEmail(''); setAvatarUrl(''); return; }
    setEmail(user.email || '');

    const res = await fetch(`${API}/userdata/${user.id}`)
    // const res = await fetch(`${API}/user_attributes/${passedUserId}`)
    const userAttsData = await res.json()
    // console.log('userAttsData = ',userAttsData)

    if(userAttsData){
        const name = userAttsData.mData.firstname
        ? userAttsData.mData.firstname + (userAttsData.mData.lastname ? ' ' + userAttsData.mData.lastname : '')
        : userAttsData.mData.username || '';
        setDisplayName(name || userAttsData.mData.email || '');
        setEmail(userAttsData.mData.email)
    }
    else {
      setDisplayName(userAttsData.mData.email || '');
    }

    const res2 = await fetch(`${API}/profile_attributes/${user.id}`)
    // const res2 = await fetch(`${API}/profile_attributes/${passedUserId}`)
    const profileAtts = await res2.json()

    if(profileAtts){
      setAvatarUrl(profileAtts.mData.note)
    }
  }, []);
  // },[passedUserId])

  useEffect(() => {
    refreshUser();
    const { data } = supabase.auth.onAuthStateChange((event,session) => {
      // console.log('event = ',event)
      // console.log('session = ',session)
      
      if(event==='SIGNED_IN'){
        // console.log('data = ',data)
        if(currentUserId!==session.user.id){
          console.log('sign in refresh called')
          setCurrentUserId(session.user.id)
          setDisplayName(''); setEmail(''); setAvatarUrl('');
          setTimeout(refreshUser, 0);
        }
      }
      else{
        setDisplayName(''); setEmail(''); setAvatarUrl('');
        setTimeout(refreshUser, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshUser, currentUserId]);

  return (
    <UserContext.Provider value={{ displayName, setDisplayName, email, setEmail, avatarUrl, setAvatarUrl, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
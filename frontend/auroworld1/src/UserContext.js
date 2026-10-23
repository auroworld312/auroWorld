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

  const refreshUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || '');

    const res = await fetch(`${API}/user_attributes/${user.id}`)
    // const res = await fetch(`${API}/user_attributes/${passedUserId}`)
    const userAttsData = res.json()

    if(userAttsData){
        const name = userAttsData.mData.firstname
        ? userAttsData.mData.firstname + (userAttsData.mData.lastname ? ' ' + userAttsData.mData.lastname : '')
        : userAttsData.mData.username || '';
        setDisplayName(name || userAttsData.mData.email || '');
        setEmail(userAttsData.mData.email)
    }
    else {
      // setDisplayName(user.email || '');
      setDisplayName(userAttsData.mData.email || '');
    }

    // const { data: userData } = await supabase
    //   .from('users')
    //   .select('firstname, lastname, username')
    //   .eq('email', user.email);
    // if (userData && userData.length > 0) {
    //   const row = userData[0];
    //   const name = row.firstname
    //     ? row.firstname + (row.lastname ? ' ' + row.lastname : '')
    //     : row.username || '';
    //   setDisplayName(name || user.email || '');
    // } else {
    //   setDisplayName(user.email || '');
    // }

    // const { data: profileData } = await supabase
    //   .from('profile_attributes')
    //   .select('note')
    //   .eq('email', user.email);
    const res2 = await fetch(`${API}/profile_attributes/${user.id}`)
    // const res2 = await fetch(`${API}/profile_attributes/${passedUserId}`)
    const profileAtts = res2.json()

    if(profileAtts){
      setAvatarUrl(profileAtts.mData.note)
    }
  // }, []);
  },[passedUserId])

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ displayName, setDisplayName, email, setEmail, avatarUrl, setAvatarUrl, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
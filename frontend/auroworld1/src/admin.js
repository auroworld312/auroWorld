import { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { quizRequest } from './quizApi';
import './Quiz.css';
export default function Admin() {
 const [accounts,setAccounts]=useState([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{quizRequest('/admin/accounts').then(setAccounts).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 return <div className="quiz-page"><Sidebar/><div className="quiz-page-main"><Header/><main className="quiz-page-content quiz-panel"><div className="quiz-page-inner"><h1>Administration</h1><p className="quiz-muted">Account directory</p>{error ? <p role="alert" className="quiz-error">{error}</p> : loading ? <p>Loading accounts...</p> : <><input aria-label="Search accounts" placeholder="Search by name or email..." value={query} onChange={e=>setQuery(e.target.value)}/>{accounts.filter(a=>`${a.username} ${a.email}`.toLowerCase().includes(query.toLowerCase())).map(a=><section className="quiz-card" key={a.username}><div className="quiz-row quiz-between"><h2>{a.username}</h2><span className="quiz-tag">{({admin:'Admin',instructor:'Teacher',user:'Student'})[a.role] || 'Needs review'}</span></div><p>{a.email}</p></section>)}</>}</div></main></div></div>;
}

import { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { quizRequest } from './quizApi';
import './Quiz.css';

const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com'

export default function Admin() {

 const [accounts,setAccounts]=useState([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);

 async function changeUserRole(uuid,role){
    try{
        const body={
            role: role
        }
        const res = await fetch(`${API}/change-role/${uuid}`,{
            method: "PUT",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify(body)
        })
        const data = await res.json()
        if(data.mStatus!=="ok"){
            alert("Changing roles failed. try again laterr")
            return
        }
    }catch(error){
        console.log('problem changing user role: ',error.message)
    }
    return
 }

 function updateDom(uuid, newRole){
    // console.log('selected uuid = ',uuid)
    const slicedUUID = uuid.slice(12)
    // console.log('slicedUUID: ',slicedUUID)
    
    const newAccounts = accounts.map((a)=>{
        if(a.unique_id===slicedUUID){
            console.log('a = ',a)
            return {username: a.username, email: a.email, role: newRole, unique_id: a.unique_id }
        }
        return a
    })
    // console.log('newAccounts: ',newAccounts)
    setAccounts(newAccounts)
    changeUserRole(slicedUUID,newRole)
 }

 function handleRoleChange(e,userRole){
    // console.log('e =',e)
    console.log('userRole= ',userRole)
    const selectedRole = document.getElementById(e.target.id)
    // console.log('selectedRole = ',selectedRole)
    console.log('value = ',selectedRole.value)
    // console.log('value length = ',selectedRole.value.length)

    if(selectedRole.value.length===0){
        console.log('value didnt change (len = 0)')
        return
    }
    else if(selectedRole.value===userRole){
        console.log('value didnt change ')
        return
    }
    else{
        updateDom(e.target.id,selectedRole.value)
    }
 }
 
 useEffect(()=>{
    quizRequest('/admin/accounts')
        .then(setAccounts)
        .catch(e=>setError(e.message))
        .finally(()=>setLoading(false));},[]);

 return <div className="quiz-page">
            <Sidebar/>
            <div className="quiz-page-main">
                <Header/>
                <main className="quiz-page-content quiz-panel">
                <div className="quiz-page-inner">
                    <h1>Administration</h1>
                    <p className="quiz-muted">Account directory</p>
                    {error ? 
                        <p role="alert" className="quiz-error">{error}</p> : loading ? <p>Loading accounts...</p> : <><input aria-label="Search accounts" placeholder="Search by name or email..." value={query} onChange={e=>setQuery(e.target.value)}/>
                        {accounts.filter(a=>`${a.username} ${a.email}`.toLowerCase().includes(query.toLowerCase())).map(a=>
                        <section className="quiz-card" key={a.username}>
                            <div className="quiz-row quiz-between">
                                <h2>{a.username}</h2>
                                {/* <span className="quiz-tag">{({admin:'Admin',instructor:'Teacher',user:'Student'})[a.role] || 'Needs review'}</span> */}
                                <select className="quiz-tag" name="roles" id = {`role-select-${a.unique_id}`} onChange={(e)=>handleRoleChange(e,a.role)}>
                                    <option value="">{({admin:'Admin',instructor:'Teacher',user:'Student'})[a.role] || 'Needs review'}</option>
                                    <option value="instructor">Teacher</option>
                                    <option value="user">Student</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <p>{a.email}</p>
                        </section>)}</>}
                    </div>
                </main>
            </div>
        </div>;
}

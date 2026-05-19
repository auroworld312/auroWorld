import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Card from './components/Card';

function Admin(){
    //const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld.onrender.com';
    const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';

    const navigate=useNavigate();
    const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

    
    async function getCurrentUserId(){
        const { data: { user } ,error} = await supabase.auth.getUser()
        if(error){
            console.log("problem grabbing uuid" +error.message)
            return
        }
        else if(user){
            console.log("current user's unique id: "+user.id)
            return user.id
        }
    }
    
    function mainpageButton(){
        navigate("/posts")
    }
    function coursesButton(){
        navigate("/courses")
    }
    function admin(){
        navigate("/admin")
    }
    async function signoutButton(){
        const { error } = await supabase.auth.signOut();
        if (!error) {
            //console.log('User signed out successfully and session cleared.');
            navigate("/login")
        } else {
            console.error('Error signing out:', error.message);
        }
    }

    async function editUserEntry(username){
        console.log(username)
        document.getElementById(`editEntry-${username}`).style.display="block"
        //document.getElementById("editEntry").style.display="block"
        return
    }

    async function cancelEditUserEntry(username){
        console.log(username)
        document.getElementById(`editEntry-${username}`).style.display="none"
        //document.getElementById("editEntry").style.display="none"
        return
    }
    async function sendEditUserEntry(username,unique_id){
        // console.log(uuid)
        try{
            const editBody={
                username: document.getElementById(`editUsername-${username}`).value,
                role: document.getElementById(`editRole-${username}`).value,
                unique_id :unique_id
            }
            const editUserRoleResponse = await fetch(`${API}/change/role`,{
                method:"PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editBody)
            })
            const editUserRoleData = await editUserRoleResponse.json()
            if(editUserRoleData.mMessage!=="ok"){
                alert("Problem changing a user's username/role. Try again later ")
                return
            }
            else{
                alert("User's username/role changed successfully. ")
                return
            }
        }catch(error){
            console.log(error.message)
            return
        }
    }   

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserName, setCurrentUserName] = useState("Loading...");

    useEffect(() => {
        async function fetchUserData() {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (user) {
                setCurrentUserId(user.id);
                try {
                    const { data: profileData, error: profileError } = await supabase
                        .from('users') 
                        .select('firstname, lastname, username')
                        .eq('email', user.email)
                        .single();
                    if (profileData) {
                        setCurrentUserName(`${profileData.firstname} ${profileData.lastname}`);
                    } else if(profileError){
                        setCurrentUserName(user.email?.split('@')[0] || "User");
                    }
                } catch (err) {
                    console.error("查表报错:", err);
                    setCurrentUserName(user.email?.split('@')[0] || "User");
                }
            } else if(authError){
                setCurrentUserName("Guest");
            }
        }
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const[role,setRole] = useState(null)
    

    const [users, setUsers] = useState([])

    useEffect(() => {
        async function gatherAllUsers(){
            const userId = await getCurrentUserId()
            console.log("userId is: "+userId)
            fetch(`${API}/get/allusers`)
            .then(res => res.json())
            .then(data => {
                console.log("FULL RESPONSE:", data)
                console.log("getallusers mData:", data.mData)
                setUsers(data.mData);
            })
            .catch(err => console.error("FETCH ERROR for getting users:", err))
        }
        gatherAllUsers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    const [data, setData] = useState([]);
    const [sortType, setSortType] = useState('sortByUsername');

    useEffect(() => {
        const sortArray = type =>{
            const types ={
                sortByUsername: 'username',
                sortByRole: 'role',
                sortByEmail: 'email',
                sortByFirstname: 'firstname',
                sortByLastname: 'lastname',
            }
            const sortProperty=types[type]
            const sorted = [...users].sort((a,b) => b[sortProperty]-a[sortProperty])
            setData(sorted)
        }
        sortArray(sortType)
    }, [sortType, users])

    const[usernameListQuery,setUsernameListQuery] = useState("")

    const [userAttributes,setUserAttributes]=useState(null)
    useEffect(()=>{
        async function getUserAtts(){
            try{
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { return; }
                const uuidString = user.id
                const res= await fetch(`${API}/userdata/${uuidString}`)
                const data = await res.json()
                //console.log("getUserAtts mData: "+data.mData.role)
                setUserAttributes(data.mData)
            }catch(error){
                console.log(error.message)
            }
            return
        }
        getUserAtts()
    },[])

    if(userAttributes?.role!=="admin"){
        return (
             <div style={{ display: 'flex', width: '100vw', margin: '0', overflow: 'hidden', backgroundColor: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize: '16px', color: '#111' }}>
                <label>You do not have permission to view this page. 
                </label>
             </div>
        )
    }

//height: '100vh',
//${user.unique_id
    else return (
         <div style={{ display: 'flex', width: '100vw', margin: '0', overflow: 'hidden', backgroundColor: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize: '16px', color: '#111' }}>
            <Sidebar 
                onMainpage={mainpageButton} 
                onCourses={coursesButton}
                onSignout={signoutButton} 
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Header username={currentUserName} />

                <select onChange={(e) => setSortType(e.target.value)}>
                    <option value="sortByUsername">Sort Users By Username</option>
                    <option value="sortByRole">Sort Users By Role</option>
                    <option value ="sortByEmail">Sort Users By Email</option>
                    <option value="sortByFirstname">Sort Users By Firstname</option>
                    <option value="sortByLastname">Sort Users By Lastname</option>
                </select>
                <input type="text" placeholder="Search for Users By Username..." className="search" onChange={(e) => setUsernameListQuery(e.target.value)} />

                <div id="userList" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {data.filter((user)=>user.username.toLowerCase().includes(usernameListQuery))?.map((user, i) => (

                        <Card key={i}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>{user.username}</td>
                                        <td>{user.firstname}</td>
                                        <td>{user.lastname}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <button onClick={()=>editUserEntry(user.username,user.role)}>Edit</button>
                                    </tr>
                                </tbody>
                            </table>
                            <div id ={`editEntry-${user.username}`} style={{display:'none',marginTop: '15px'}}>
                                <label style={{ marginTop: '15px' }}>*Username</label>
                                <input type="text" defaultValue={user.username} id={`editUsername-${user.username}`} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                                {/* <label style={{ marginTop: 0 }}>*Firstname</label>
                                <input type ="text" id={`editFirstname-${user.username}`} defaultValue={user.firstname} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}/> */}

                                {/* <label style={{ marginTop: 0 }}>*Lastname</label>
                                <input type="text" defaultValue={user.lastname} id={`editLastname-${user.username}`} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} /> */}

                                {/* <label style={{ marginTop: 0 }}>*Email</label>
                                <input type="text" defaultValue={user.email} id="editEmail" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} /> */}

                                <label style={{ marginTop: 0 }}>*Role</label>
                                <select defaultValue= {user.role} id={`editRole-${user.username}`} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                                    <option>user</option>
                                    <option>instructor</option>
                                    <option>admin</option>
                                </select>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button variant ="secondary" onClick={() => sendEditUserEntry(user.username,user.unique_id)}>Send</button>
                                    <button variant="secondary" onClick={() => cancelEditUserEntry(user.username)}>Cancel</button>
                                </div>
                            </div>
                        </Card>
                    ))}
                
                </div>

            </div>

        </div>
        
    )
}

export default Admin;

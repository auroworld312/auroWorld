
import {useState, useRef, useEffect} from 'react';
import { useLocation, useNavigate} from "react-router-dom";
import { supabase } from './utils/supabaseClient.js';
import Sidebar from './components/Sidebar.js';
import Header from './components/Header.js';
import './reportProblem.css'
import './spinner/spin.css'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com'

function ReportProblem(){
    const navigate=useNavigate();

    const [fileUpload,setFileUpload] = useState()
    const [previewUrl, setPreviewUrl] = useState()
    const [fileName, setFileName] = useState("No file chosen");

    const [sending, setSending] = useState(false)

    const {state} = useLocation()
    const {passedUserId} = state || {}

    const [currentUserId, setCurrentUserId] = useState(null)
    const currentUserIdGrabbed = useRef(false)
    useEffect(()=>{
        if(currentUserIdGrabbed.current===false){
            if(passedUserId === null || passedUserId === undefined){
                async function getCurrentUserId(){
                    const { data: { user } ,error} = await supabase.auth.getUser()
                    if(error){ 
                        setCurrentUserId('noId')
                    }
                    else if(user){ 
                        setCurrentUserId(user.id) 
                    }
                }
                getCurrentUserId()
            }
            else{
                setCurrentUserId(passedUserId)
            }
        }
        return ()=>{
            currentUserIdGrabbed.current  = true
        }
    },[passedUserId, currentUserId])

    const [currentUserName, setCurrentUserName] = useState("Loading...");
    const usernameGrabbed = useRef(false)
    useEffect(()=>{
        if(currentUserId!==null){
            if(usernameGrabbed.current===false && currentUserId!=='noId'){
                async function getUserAtts(){
                    try{
                        const res= await fetch(`${API}/userdata/${currentUserId}`)
                        const data = await res.json()

                        if(data.mData.firstname===null || data.mData.lastname===null){
                            setCurrentUserName(data.mData.email?.split('@')[0] || "User")
                        }
                        else{
                            setCurrentUserName(`${data.mData.firstname} ${data.mData.lastname}`)
                        } 
                    }catch(error){
                        console.log('problem grabbing useratts = ',error.message)
                    }
                    return
                }
                getUserAtts()
            }
            return ()=>{
                usernameGrabbed.current=true
            }
        }
    },[currentUserId])

    function mainpageButton(){ navigate("/posts",{state:{passedUserId: currentUserId}}) }
    function coursesButton(){ navigate("/courses",{currentUserId}) }
    function adminButton(){ navigate("/admin") }

    async function signoutButton(){
        const { error } = await supabase.auth.signOut();
        if (!error) { navigate("/login") }
        else { console.error('Error signing out:', error.message); }
    }

    function uploadImageHandler(e){
        // console.log('image handerl')
        const file = e.target.files[0];
        // console.log('file = ',file)
        if (file) {
            setFileUpload(file); 
            setPreviewUrl(URL.createObjectURL(file)); 
            setFileName(file.name); 
        }
        else { setFileName("No file chosen"); }
    }
    
    function removeFile(){
        if(fileUpload){
            setFileUpload(undefined)
            setPreviewUrl(undefined)
            setFileName("No file chosen")

            const fileInput = document.getElementById('screenshot');
            fileInput.value = '';
        }
    }

    async function sendReport(){
        setSending(true)
        
        const description = document.getElementById('description').value
        const title = document.getElementById('subject').value
        let filepath = null

        if(fileUpload){
            const fileId = crypto.randomUUID()
            filepath = 'report_problem_screenshots/'+fileId+'/'+fileName
        }

        try{
            const reportBody={
                description: description,
                title: title,
                filepath: filepath,
                uuid: currentUserId
            }
            const res = await fetch(`${API}/report-problem`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reportBody)
            });
            const mData = await res.json()
            if(mData.mStatus!=="ok"){
                setSending(false)
                alert("Failed to send report. Try again later")
                return
            }
            console.log('mData = ',mData)
            if(fileUpload){
                const {data,error} = await supabase.storage.from('report_problem_screenshots').upload(filepath, fileUpload)
                if(data){
                    console.log(data)
                    console.log("data.path: "+data.path)
                }
                else {
                    console.log(error.message)
                    setSending(false)
                    alert("Problem uploading image. Try again later")
                    return
                }
            }

            setSending(false)
            alert("Thank you for the feedback!")
        }catch(error){
            console.log(error.message)
            setSending(false)
            alert("Failed to send report. Try again later")
        }
        return
    }

    return(
        <div id="reportBugForm" className='help-page' style={{ display:'flex', height:'100vh', width:'100vw', margin:'0', backgroundColor:'var(--post-page, #E3C7E6)', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize:'16px', color:'var(--post-text, #111)', opacity:sending? 0.5 : 1 }}>
            
            <div className = 'loader' style={{display:sending?'flex':'none'}}></div>
            
            <Sidebar onMainpage={mainpageButton} onCourses={coursesButton} onSignout={signoutButton} onAdmin={adminButton} />
            
            <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                
                <Header username={currentUserName} />

                <h1>Report a Problem</h1>
                <div className="form-example">
                    <div className="form-example">
                        <label for="subject">What is the problem?</label>
                        <input type="text" name="subject" id="subject" required />
                    </div>
                    <div className ="form-example">
                        <label for="description">Describe your problem here.</label>
                        <textarea name="description" id="description" rows = '5' cols = '40' required></textarea>
                    </div>
                    <div className ="form-example">
                        <label for="screenshot">Upload a screenshot of the problem if you wish. </label>
                        <input type="file" name="screenshot" id="screenshot" onChange={uploadImageHandler}/>

                        <button style={{display:'flex', alignSelf: 'flex-start'}}id="remove-file" onClick={removeFile}>Clear</button>
                        <img src={previewUrl} alt="" style={{ maxWidth:'75%', borderRadius:'8px' }}></img>
                        {fileUpload &&(
                            <div style={{ margin:'10px 0', fontSize:'14px', color:'var(--post-muted, #666)' }}>
                                <p>Selected File: {fileUpload.name}</p>
                                <p>Size: {fileUpload.size} bytes</p>
                                <p>Type: {fileUpload.type}</p>
                            </div>
                        )}
                    </div>
                    <div className="form-example">
                        <input type="submit" value="Submit" onClick={sendReport} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ReportProblem;
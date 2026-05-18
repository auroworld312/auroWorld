import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

const API = window.location.hostname === "localhost" ? "http://localhost:8080" : "https://auroworld.onrender.com";
const PURPLE = '#6C63FF';
const PURPLE_LIGHT = '#EDE9FF';

function TabButton({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            padding: '10px 28px', borderRadius: '8px', border: active ? 'none' : '1.5px solid #e0e0e0',
            cursor: 'pointer', fontSize: '14px', fontWeight: '700',
            backgroundColor: active ? PURPLE : '#fff',
            color: active ? '#fff' : '#555',
            transition: 'all 0.18s',
        }}>
            {label}
        </button>
    );
}

function VideoTab({ course }) {
    const btnStyle = {
        display: 'inline-block', padding: '13px 36px', borderRadius: '999px',
        backgroundColor: course.inSession ? '#1a7a50' : PURPLE,
        color: '#fff', fontWeight: '700', fontSize: '15px',
        textDecoration: 'none',
        opacity: course.inSession ? 1 : 0.55,
        cursor: course.inSession ? 'pointer' : 'not-allowed',
        pointerEvents: course.inSession ? 'auto' : 'none',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '56px' }}>🎥</div>
            <div>
                <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800' }}>{course.title}</h2>
                <p style={{ margin: '0 0 4px', color: '#666', fontSize: '14px' }}>Instructor: {course.instructor}</p>
                <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>Times: {course.times}</p>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    fontSize: '13px', fontWeight: '600', padding: '6px 14px',
                    borderRadius: '999px', marginBottom: '24px',
                    backgroundColor: course.inSession ? '#d4f5e9' : '#f0f0f0',
                    color: course.inSession ? '#1a7a50' : '#888',
                }}>
                    <span style={{ fontSize: '10px' }}>{course.inSession ? '●' : '○'}</span>
                    {course.inSession ? 'Class is Live Now!' : 'Not Currently in Session'}
                </div>
            </div>
            <a href={course.liveUrl || '#'} target="_blank" rel="noopener noreferrer" style={btnStyle}>
                {course.inSession ? '▶ Join Live Class' : 'Join Class (opens when live)'}
            </a>
            {!course.inSession && (
                <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>
                    The button becomes active when your instructor starts the session.
                </p>
            )}
        </div>
    );
}

async function editCourseTab(){
    document.getElementById("editTab").style.display="block";
}

async function sendEditCourseTabButton(courseId){
    // console.log(document.getElementById("editTitle").value)
    // console.log(document.getElementById("editDescription").value)
    // console.log(document.getElementById("editInstructor").value)
    // console.log(document.getElementById("edit_start_date").value)
    // console.log(document.getElementById("editLevel").value)
    // console.log(document.getElementById("editPrice").value)
    try{
        if(!document.getElementById("editTitle").value || !document.getElementById("editDescription").value
        || !document.getElementById("editInstructor").value || !document.getElementById("edit_start_date").value 
        || !document.getElementById("editLevel").value || !document.getElementById("editPrice").value
        || !document.getElementById("editLiveUrl").value || !document.getElementById("editTimes")) {
            alert("Please fill out all info")
            return
        }
        const editCourseBody={
            title:document.getElementById("editTitle").value,
            description:document.getElementById("editDescription").value,
            instructor:document.getElementById("editInstructor").value,
            startDate:document.getElementById("edit_start_date").value,
            level:document.getElementById("editLevel").value,
            price:document.getElementById("editPrice").value,
            times:document.getElementById("editTimes").value,
            liveUrl:document.getElementById("editLiveUrl").value
        }
        const response=await fetch(`${API}/courses/edit/${courseId}`,{
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editCourseBody)
        })
        const data = await response.json();
        // console.log("New Course response:",data)
        if(data.mStatus!=="ok"){
            alert("Adding course failed: "+data.mMessage);
            return;
        }
        alert("Saved")
        cancelEditCourseTab()
        //console.log("result= "+data.mData)
        return
        
    }catch(error){
        console.log(error.message)
        return
    }
}
async function cancelEditCourseTab(){
    document.getElementById("editTab").style.display="none";
}

function CourseTab({ course, userData }) {

    return (
        <div>
            { (userData?.role==="admin" || userData?.username===course.instructor) && (
                <button onClick={()=>editCourseTab()} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Edit</button>
            )}
            <h2 style={{ margin: '0 0 12px', fontSize: '26px', fontWeight: '800', color: '#111' }}>{course.title}</h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#555', fontWeight: '600' }}>Instructor: {course.instructor}</p>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#555', fontWeight: '600' }}>Times: {course.times}</p>
            {course.startDate && (
                <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#555' }}>Starting {course.startDate}</p>
            )}
            <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#333', lineHeight: 1.7 }}>{course.description}</p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {course.level && (
                    <div style={{ backgroundColor: PURPLE_LIGHT, borderRadius: '8px', padding: '10px 16px' }}>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Level</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: PURPLE }}>{course.level}</div>
                    </div>
                )}
                {course.price && (
                    <div style={{ backgroundColor: PURPLE_LIGHT, borderRadius: '8px', padding: '10px 16px' }}>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Price</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: PURPLE }}>{course.price}</div>
                    </div>
                )}
                {course.times && (
                    <div style={{ backgroundColor: PURPLE_LIGHT, borderRadius: '8px', padding: '10px 16px' }}>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Schedule</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: PURPLE }}>{course.times}</div>
                    </div>
                )}
            </div>
            <div id="editTab" style={{display:'none',marginTop: '15px'}}>
                <h3 style={{ marginTop: 0 }}>Edit Course Tab</h3>
                 <label style={{ marginTop: '15px' }}>Course Title</label>
                <input type="text" defaultValue={course.title} id="editTitle" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                <label style={{ marginTop: 0 }}>Course Description</label>
                <textarea id="editDescription" defaultValue={course.description} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', minHeight: '80px', boxSizing: 'border-box' }}></textarea>

                <label style={{ marginTop: 0 }}>Instructor</label>
                <input type="text" defaultValue={course.instructor} id="editInstructor" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                <label style={{ marginTop: 0 }}>Times</label>
                <input type="text" defaultValue={course.startDate} id="editTimes" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                <label style={{ marginTop: 0 }}>Start Date</label>
                <input type="text" defaultValue={course.times} id="edit_start_date" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                <label style={{ marginTop: 0 }}>Level</label>
                <select defaultValue= {course.level} id="editLevel" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                </select>

                <label style={{ marginTop: 0 }}>Price</label>
                <select defaultValue={course.price} id="editPrice" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                    <option>Free</option>
                    <option>Priced</option>
                </select>

                 <label style={{ marginTop: 0 }}>Live Meeting Url</label>
                 <input type="text" defaultValue={course.liveUrl} id="editLiveUrl" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button variant ="secondary" onClick={() => sendEditCourseTabButton(course.courseId)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Send</button>
                    <button variant="secondary" onClick={() => cancelEditCourseTab()} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
async function addMaterials(){

    document.getElementById("addVideo").style.display="block"
}
async function cancelMaterials(){

    document.getElementById("addVideo").style.display="none"
}
async function uploadNewMaterials(filename,unitId,courseId,filedata){
    // console.log("uploading video for unit "+unitId)
    // console.log("for course: "+courseId)
    if(!document.getElementById("videoTitle").value){
        alert("Enter a title for upload")
        return
    }
    console.log("filename: "+filename)
    console.log("filedata: "+filedata)
    
    try{
        if(!(filedata) || filename==="No file chosen"){
            const noVideoBody={
                title:document.getElementById("videoTitle").value,
                filepath:"empty"
            }
            const response = await fetch(`${API}/course_units/unit/${unitId}`,{
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(noVideoBody)
            })
            const videoData = await response.json();
            if(videoData.mStatus!=="ok"){
                alert("Adding video failed: "+videoData.mMessage);
            }
            return
        }
        const doesFileExist = await fetch(`${API}/unit_videos/${unitId}/${document.getElementById("videoTitle").value}`)
        const doesFileExistData= await doesFileExist.json()

        if(doesFileExistData.mData){
            alert("Video with that title in this unit already exists. Give a new title")
            return
        }
        const videoBody={
            title:document.getElementById("videoTitle").value,
            // eslint-disable-next-line
            filepath:'course/'+courseId+'/'+'unit/'+unitId+'/'+document.getElementById("videoTitle").value+'/'+filename
        }
        const response = await fetch(`${API}/course_units/unit/${unitId}`,{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(videoBody)
        })
        const videoData = await response.json();
        if(videoData.mStatus!=="ok"){
            alert("Adding video failed: "+videoData.mMessage);
            return;
        }
        //console.log("addVideo new video Id= "+videoData.mData)
        // eslint-disable-next-line
        const {data,error} = await supabase.storage.from('course_videos').upload('course/'+courseId+'/'+'unit/'+unitId+'/'+document.getElementById("videoTitle").value+'/'+filename, filedata)
        if(data){
            alert('Added video successfully.')
            //console.log(data)
        }
        else if(error){
            //console.log(error.message)
        }
        return
    }catch(error){
        //console.log(error.message)
        return
    }
}
//unit={unit} courseId = {course.courseId} role ={userData?.role} username={userData?.username} instructor={course.instructor} unitId={unit.unitId}

function UnitSection({ unit, courseId, role, username, instructor, unitId }) {
    const [open, setOpen] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null);

    const [fileUpload,setFileUpload]=useState()
    const [fileName, setFileName] = useState("No file chosen");

    function uploadFileHandler(e){
        const file = e.target.files[0];
        if (file) {
            setFileUpload(file);
            setFileName(file.name);
        }else {
            setFileName("No file chosen"); 
        }
    }
    const [fileUrl,setFileUrl]=useState([])

    useEffect(()=>{
        async function getFileUrls(){
            if (!unit.videos) return
            const fileUrlsSet={}
            for (const video of unit.videos){
                //console.log(video)
                // const videoUrlString=video.driveUrl
                // console.log(videoUrlString)
                if (video.driveUrl.includes(`course/${courseId}/unit/${unitId}/`)){
                    //console.log('has it')
                    try{
                        const { data} = supabase.storage
                            .from('course_videos')
                            .getPublicUrl(video.driveUrl);
                        //console.log("data from courses_videos: ",data)
                        if (data && data.publicUrl) {
                            //console.log('Public URL:', data.publicUrl);
                        } else {
                            console.error('Error getting public URL or URL is undefined');
                        }
                        
                        fileUrlsSet[video.videoId] = data.publicUrl;

                    }catch(err){
                        console.error(err)
                        fileUrlsSet[video.videoId]=null
                    }
                }
                else{
                    fileUrlsSet[video.videoId]=video.driveUrl
                }
                //console.log('videoUrlsSet: '+videoUrlsSet)
            }
            setFileUrl(fileUrlsSet)
        }
        getFileUrls()
        //console.log(videoUrl)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    // console.log("unit videos: "+unit.videos)
    // for( const v of unit.videos){
    //     console.log(v.driveUrl)
    // }
    async function deleteFile(driveurl, unitId, videoId){
        // console.log("deleteVideo id: "+videoId)
        // console.log("deleteVideo driveurl: "+driveurl)
        try{
            const videoEntry=await fetch(`${API}/delete/unit_videos/unit/${unitId}/videoId/${videoId}`,{
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
            const videoEntryData= await videoEntry.json()
            //console.log("videoEntryData: "+videoEntryData )
            if(videoEntryData.mStatus!=="ok"){
                //alert("Deleting video entry failed. Try again later")
                return
            }
            const { data, error } = await supabase
                .storage
                .from('course_videos')
                .remove([driveurl])
            if(data){
                alert("Video deleted.")
                return
            }
            else if(error){
                //alert("Deleting video data failed. Try again later")
                return
            }
        }catch(error){
            console.log(error.message)
            return
        }
    }

    return (
        <div style={{ border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div onClick={() => setOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', cursor: 'pointer',
                backgroundColor: open ? PURPLE_LIGHT : '#fff',
                transition: 'background-color 0.15s', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, backgroundColor: open ? PURPLE : '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s' }}>
                        <span style={{ fontSize: '14px', color: open ? '#fff' : '#555' }}>📁</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#111' }}>{unit.title}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{unit.videos?.length || 0} video{unit.videos?.length !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <span style={{ fontSize: '20px', color: '#bbb', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
            </div>
            {(role==="admin" || username===instructor ) && (
                <button onClick={addMaterials} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                    Add File
                </button>
            )}
            <div id ="addVideo" style={{display: 'none'}}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <input type="file" id="hiddenAddFileInput" onChange={uploadFileHandler} style={{ display: 'none' }}></input>
                    <button variant="secondary" onClick={() => document.getElementById("hiddenAddFileInput").click()}>Upload File</button>
                    
                    <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>{fileName}</span>
                </div>

                    <label style={{ marginTop: 0 }}>Enter Title</label>
                    <input type="text" id="videoTitle" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                {fileUpload &&(
                    <div style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
                        <p>Selected File: {fileUpload.name}</p>
                        <p>Size: {fileUpload.size} bytes</p>
                        <p>Type: {fileUpload.type}</p>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={()=>uploadNewMaterials(fileName,unitId,courseId,fileUpload)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Send</button>
                    <button variant="secondary" onClick={cancelMaterials} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>

            {open && (
                <div style={{ borderTop: '1px solid #eee' }}>
                    {(!unit.videos || unit.videos.length === 0) ? (
                        <div style={{ padding: '20px', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No videos in this unit yet.</div>
                    ) : unit.videos.map((video, idx) => (
                        <div key={video.videoId} style={{ borderBottom: idx < unit.videos.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <div onClick={() => setActiveVideo(activeVideo === video.videoId ? null : video.videoId)}
                                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px 14px 28px', cursor: 'pointer', backgroundColor: activeVideo === video.videoId ? '#f9f9f9' : '#fff', transition: 'background-color 0.12s' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, backgroundColor: activeVideo === video.videoId ? PURPLE : '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', transition: 'all 0.15s' }}>
                                    <span style={{ color: activeVideo === video.videoId ? '#fff' : '#666' }}>▶</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    { (role==="admin" || username===instructor) && (
                                        <button className = "delete-video" onClick={()=>deleteFile(video.driveUrl,unitId,video.videoId)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    )}
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>
                                        {video.title}
                                    </div>
                                    {video.duration && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{video.duration}</div>}
                                </div>
                                <span style={{ fontSize: '16px', color: '#ccc', transform: activeVideo === video.videoId ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
                            </div>
                             {/* backgroundColor: '#1a1a1a', */}
                            {activeVideo === video.videoId && (
                                <div style={{ backgroundColor:'#f5c8f3' }}>
                                    {video.driveUrl && !video.driveUrl.includes('FILE_ID') && video.driveUrl!=="empty" ? (
                                        <iframe src={fileUrl[video.videoId]} width="100%" height="800" allow="autoplay" style={{ border: 'none', display: 'block' }} title={video.title} />
                                    ) : (
                                        <div style={{height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', gap: '10px' }}>
                                            {/* <span style={{ fontSize: '32px' }}>🎬</span> */}
                                            <a href={video.title} target="_blank" rel="noopener noreferrer" style={{fontSize: '25px' }}>Take your quiz here</a>
                                            <span style={{fontSize: '23px' }}>Click the link to take your quiz!</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))} 
                </div>
            )}
        </div>
    );
}

async function newUnitButton() {
    document.getElementById("addUnit").style.display = "block";
}
async function cancelNewUnit() {
    document.getElementById("addUnit").style.display = "none";
}
async function submitNewUnit(courseId) {
    if (!document.getElementById("unitName").value) { alert("Please enter a unit name"); return; }
    try {
        const unitBody = { unitName: document.getElementById("unitName").value };
        const response = await fetch(`${API}/course_units/${courseId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(unitBody) });
        const data = await response.json();
        if (data.mStatus !== "ok") { alert("Adding unit failed: " + data.mMessage); return; }
    } catch (error) { console.log(error.message); }
}

function MaterialsTab({ course, userData }) {
    if (!course.units || course.units.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '15px' }}>
                No materials available yet.
                <div style={{ marginTop: '20px' }}>
                    { (userData?.role==="admin" || userData?.username===course.instructor) && (
                        <button onClick={newUnitButton} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Add a New Unit</button>
                    )}
                    <div id="addUnit" style={{ display: 'none', marginTop: '16px', textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Unit name</label>
                        <input type="text" id="unitName" style={{ padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => submitNewUnit(course.courseId)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Create</button>
                            <button onClick={cancelNewUnit} style={{ padding: '9px 16px', borderRadius: '8px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '15px' }}>
                { (userData?.role==="admin" || userData?.username===course.instructor) && (
                    <button onClick={newUnitButton} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Add a New Unit</button>
                )}
                <div id="addUnit" style={{display: 'none'}}>
                        <label style={{ marginTop: 0 }}>Unit name</label>
                        <input type="text" id="unitName" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                        <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={()=>submitNewUnit(course.courseId)}>Create</button>
                        <button variant="secondary" onClick={cancelNewUnit}>Cancel</button>
                    </div>
                </div>
            </div>
            {course.units.map(unit => <UnitSection key={unit.unitId} unit={unit} courseId = {course.courseId} role ={userData?.role} username={userData?.username} instructor={course.instructor} unitId={unit.unitId}/>)}
        </div>
    );
}

function CourseDetail() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [currentUserId, setCurrentUserId] = useState(null);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('course');
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/login'); return; }
            setCurrentUserId(user.id);

            const enrollRes = await fetch(`${API}/courses/enrolled/${user.id}`);
            const enrollData = await enrollRes.json();
            const enrolledIds = new Set((enrollData.mData || []).map(c => c.courseId));
            setIsEnrolled(enrolledIds.has(parseInt(courseId)));

            const res = await fetch(`${API}/courses/${courseId}`);
            const data = await res.json();
            if (data.mStatus === 'ok') setCourse(data.mData);
            setLoading(false);
        }
        init();
    }, [courseId, navigate]);

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
    //console.log("userAttributes: "+userAttributes)

    async function handleEnroll() {
        if (!currentUserId) return;
        setEnrolling(true);
        try {
            const res = await fetch(`${API}/courses/${courseId}/enroll`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_uuid: currentUserId }),
            });
            const data = await res.json();
            if (data.mStatus === 'ok') setIsEnrolled(true);
            else alert('Enroll failed: ' + data.mMessage);
        } catch (e) { console.error(e); }
        finally { setEnrolling(false); }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#999', fontSize: '15px' }}>
                Loading…
            </div>
        );
    }

    if (!course) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
                Course not found.{' '}
                <span style={{ cursor: 'pointer', color: PURPLE, textDecoration: 'underline', marginLeft: '6px' }} onClick={() => navigate('/courses')}>Go back</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Header />

                <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', gap: '24px' }}>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Back + Tabs */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                            <button onClick={() => navigate('/courses')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#555', padding: '8px 16px' }}>
                                ← Back
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <TabButton label="Video" active={activeTab === 'video'} onClick={() => setActiveTab('video')} />
                                <TabButton label="Course" active={activeTab === 'course'} onClick={() => setActiveTab('course')} />
                                <TabButton label="Materials" active={activeTab === 'materials'} onClick={() => setActiveTab('materials')} />
                            </div>
                        </div>

                        {/* Tab content */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', minHeight: '400px' }}>
                            {activeTab === 'video' && <VideoTab course={course} />}
                            {activeTab === 'course' && <CourseTab course={course} userData={userAttributes} />}
                            {activeTab === 'materials' && <MaterialsTab course={course} userData={userAttributes} />}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div style={{ width: '240px', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Thumbnail */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ height: '160px', backgroundColor: PURPLE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📚</div>
                            )}

                            <div style={{ padding: '16px' }}>
                                {course.price && course.price !== 'Free' && (
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', marginBottom: '12px' }}>{course.price}</div>
                                )}
                                {course.price === 'Free' && (
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', marginBottom: '12px' }}>Free</div>
                                )}

                                {isEnrolled ? (
                                    <button disabled style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE_LIGHT, color: PURPLE, fontWeight: '700', fontSize: '14px', cursor: 'not-allowed' }}>
                                        ✓ Already Enrolled
                                    </button>
                                ) : (
                                    <button onClick={handleEnroll} disabled={enrolling} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '700', fontSize: '14px', cursor: enrolling ? 'not-allowed' : 'pointer', opacity: enrolling ? 0.7 : 1 }}>
                                        {enrolling ? 'Enrolling...' : 'Enroll Now'}
                                    </button>
                                )}

                                {/* Course highlights */}
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '10px' }}>Course Highlights:</div>
                                    <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.7 }}>
                                        <div>• Instructor: {course.instructor}</div>
                                        {course.level && <div>• Level: {course.level}</div>}
                                        {course.times && <div>• Schedule: {course.times}</div>}
                                        {course.startDate && <div>• Starts: {course.startDate}</div>}
                                        {course.units && course.units.length > 0 && <div>• {course.units.length} unit{course.units.length !== 1 ? 's' : ''}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live status */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: course.inSession ? '#e53935' : '#aaa' }}>
                                {course.inSession ? 'Live Now' : 'Not Live'}
                            </span>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: course.inSession ? '#e53935' : '#ccc' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseDetail;
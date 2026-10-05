
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReactGA from "react-ga4";
import UnitMaterials from './UnitMaterials';
import './spinner/spin.css'

const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')
 
//const API = window.location.hostname === "localhost" ? "http://localhost:8080" : "https://auroworld.onrender.com";
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';
const PURPLE = '#6C63FF';
const PURPLE_LIGHT = '#EDE9FF';
const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const COURSE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? '00' : '30';
    return {
        value: `${String(hour).padStart(2, '0')}:${minute}`,
        label: `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`,
    };
});

function getCourseTimeValues(times) {
    const matches = [...(times || '').matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)];
    if (matches.length !== 2) return ['', ''];
    return matches.map(([, hour, minute = '00', period]) => {
        if (Number(hour) < 1 || Number(hour) > 12) return '';
        const value = `${String(Number(hour) % 12 + (period.toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`;
        return COURSE_TIME_OPTIONS.some(option => option.value === value) ? value : '';
    });
}
 
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
 
function isCourseTime(course, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(course.startDate || '')) return false;
    const startDate = new Date(`${course.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || now < startDate) return false;
    const days = (course.daysOfWeek || '').split(',').filter(day => /^[0-6]$/.test(day)).map(Number);
    if (!days.includes(now.getDay())) return false;
    const [start, end] = getCourseTimeValues(course.times);
    if (!start || !end || end <= start) return false;
    const toMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= toMinutes(start) && minutes < toMinutes(end);
}

function VideoTab({ course }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    const inClassTime = isCourseTime(course, now);
    const canJoin = inClassTime && /^https?:\/\//i.test(course.liveUrl || '');
    const btnStyle = {
        display: 'inline-block', padding: '13px 36px', borderRadius: '999px',
        backgroundColor: canJoin ? '#1a7a50' : '#bdbdbd',
        color: '#fff', fontWeight: '700', fontSize: '15px',
        textDecoration: 'none',
        border: 'none',
        cursor: canJoin ? 'pointer' : 'not-allowed',
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
                    backgroundColor: inClassTime ? '#d4f5e9' : '#f0f0f0',
                    color: inClassTime ? '#1a7a50' : '#888',
                }}>
                    <span style={{ fontSize: '10px' }}>{inClassTime ? '●' : '○'}</span>
                    {inClassTime ? 'Scheduled Class Time' : 'Not Currently in Session'}
                </div>
            </div>
            <button disabled={!canJoin} style={btnStyle} onClick={() => {
                if (canJoin && isCourseTime(course, new Date())) window.open(course.liveUrl, '_blank', 'noopener,noreferrer');
            }}>
                {canJoin ? '▶ Join Class' : 'Join Class (unavailable)'}
            </button>
            {!canJoin && (
                <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>
                    {inClassTime ? 'A valid meeting link is required.' : 'Available on scheduled days between the start and end time, from the course start date (your local time).'}
                </p>
            )}
        </div>
    );
}
 
// async function editCourseTab(){
//     document.getElementById("editTab").style.display="block";
// }
 
// async function sendEditCourseTabButton(courseId){
//     try{
//         if(!document.getElementById("editTitle").value || !document.getElementById("editDescription").value
//         || !document.getElementById("editInstructor").value || !document.getElementById("edit_start_date").value
//         || !document.getElementById("editLevel").value || !document.getElementById("editPrice").value
//         || !document.getElementById("editLiveUrl").value) {
//             alert("Please fill out all info")
//             return
//         }

//         const startTime = document.getElementById('editStartTime').value;
//         const endTime = document.getElementById('editEndTime').value;
//         const startOption = COURSE_TIME_OPTIONS.find(option => option.value === startTime);
//         const endOption = COURSE_TIME_OPTIONS.find(option => option.value === endTime);
//         if (!startOption || !endOption || endTime <= startTime) {
//             alert('Please select a start time and a later end time on the same day.');
//             return;
//         }

//         const selectedDays = [];
//         for (let i = 0; i < 7; i++) {
//             if (document.getElementById(`editDay-${i}`).checked) selectedDays.push(i);
//         }
//         if (selectedDays.length === 0) {
//             alert("Please select at least one day of the week");
//             return;
//         }

//         const editCourseBody={
//             title:document.getElementById("editTitle").value,
//             description:document.getElementById("editDescription").value,
//             instructor:document.getElementById("editInstructor").value,
//             startDate:document.getElementById("edit_start_date").value,
//             level:document.getElementById("editLevel").value,
//             price:document.getElementById("editPrice").value,
//             times: `${startOption.label} - ${endOption.label}`,
//             liveUrl:document.getElementById("editLiveUrl").value,
//             daysOfWeek: selectedDays.join(',')   // NEW, e.g. "1,3,5"
//         }
//         const response=await fetch(`${API}/courses/edit/${courseId}`,{
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(editCourseBody)
//         })
//         const data = await response.json();
//         if(data.mStatus!=="ok"){
//             alert("Adding course failed: "+data.mMessage);
//             return;
//         }
//         alert("Saved")
//         cancelEditCourseTab()
//         window.location.reload(); // simplest way to refresh course.daysOfWeek in state
//         return
//     }catch(error){
//         console.log(error.message)
//         return
//     }
// }
// async function cancelEditCourseTab(){
//     document.getElementById("editTab").style.display="none";
// }
 
// async function deleteCourseButton(courseId, navigate){
//     if (!window.confirm('Delete this course? This cannot be undone.')) return;
//     try{

//         const courseVideosFilepaths = await fetch(`${API}/filepaths/course/${courseId}`)

//         const filepathsResponse = await courseVideosFilepaths.json()

//         // console.log(filepathsResponse)

//         // console.log('filepathResponse.mdata = ',filepathsResponse.mData)
//         if(filepathsResponse.length>0){
//             const { data, removeError } = await supabase.storage.from('course_videos').remove(filepathsResponse.mData);
//             if(removeError || !data){
//                 console.log('remove error')
//                 return
//             }
//         }
//         const response = await fetch(`${API}/courses/${courseId}`,{
//             method: "DELETE",
//             headers: { "Content-Type": "application/json" },
//             // body: JSON.stringify({ user_uuid: uuid })
//         })
//         const deleteCourse = await response.json();
//         if(deleteCourse.mStatus!=="ok"){
//             alert("Deleting course failed: "+deleteCourse.mMessage);
//             return;
//         }

//         alert("Course deleted.")
//         navigate('/courses');
//     }catch(error){
//         console.log(error.message)
//         return
//     }
// }
 
function CourseTab({ course, userData, onCourseUpdated, currentUserId, navigate }) {
    const canManage = userData?.role==="admin" || (userData?.username===course.instructor);
    const [editTimes, setEditTimes] = useState(() => getCourseTimeValues(course.times));
    const [loadingCourseTab, setLoadingCourseTab] = useState(false)

    function editCourseTab(){
        document.getElementById("editTab").style.display="block";
    }
    
    async function sendEditCourseTabButton(courseId){
        try{
            if(!document.getElementById("editTitle").value || !document.getElementById("editDescription").value
            || !document.getElementById("editInstructor").value || !document.getElementById("edit_start_date").value
            || !document.getElementById("editLevel").value || !document.getElementById("editPrice").value
            || !document.getElementById("editLiveUrl").value) {
                alert("Please fill out all info")
                return
            }
            const startTime = document.getElementById('editStartTime').value;
            const endTime = document.getElementById('editEndTime').value;
            const startOption = COURSE_TIME_OPTIONS.find(option => option.value === startTime);
            const endOption = COURSE_TIME_OPTIONS.find(option => option.value === endTime);
            if (!startOption || !endOption || endTime <= startTime) {
                alert('Please select a start time and a later end time on the same day.');
                return;
            }

            const selectedDays = [];
            for (let i = 0; i < 7; i++) {
                if (document.getElementById(`editDay-${i}`).checked) selectedDays.push(i);
            }
            if (selectedDays.length === 0) {
                alert("Please select at least one day of the week");
                return;
            }
            setLoadingCourseTab(true)
            const editCourseBody={
                title:document.getElementById("editTitle").value,
                description:document.getElementById("editDescription").value,
                instructor:document.getElementById("editInstructor").value,
                startDate:document.getElementById("edit_start_date").value,
                level:document.getElementById("editLevel").value,
                price:document.getElementById("editPrice").value,
                times: `${startOption.label} - ${endOption.label}`,
                liveUrl:document.getElementById("editLiveUrl").value,
                daysOfWeek: selectedDays.join(',')   // NEW, e.g. "1,3,5"
            }
            const response=await fetch(`${API}/courses/edit/${courseId}`,{
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editCourseBody)
            })
            const data = await response.json();
            if(data.mStatus!=="ok"){
                // setLoadingCourseTab(false)
                alert("Adding course failed: "+data.mMessage);
                return;
            }
            // setLoadingCourseTab(false)
            alert("Saved")
            cancelEditCourseTab()
            window.location.reload(); // simplest way to refresh course.daysOfWeek in state
            return
        }catch(error){
            // setLoadingCourseTab(false)
            console.log(error.message)
            return
        }
    }
    function cancelEditCourseTab(){
        document.getElementById("editTab").style.display="none";
    }
    
    async function deleteCourseButton(courseId, navigate){
        if (!window.confirm('Delete this course? This cannot be undone.')) return;
        try{
            setLoadingCourseTab(true)
            const courseVideosFilepaths = await fetch(`${API}/filepaths/course/${courseId}`)

            const filepathsResponse = await courseVideosFilepaths.json()

            // console.log(filepathsResponse)

            // console.log('filepathResponse.mdata = ',filepathsResponse.mData)
            if(filepathsResponse.length>0){
                const { data, removeError } = await supabase.storage.from('course_videos').remove(filepathsResponse.mData);
                if(removeError || !data){
                    console.log('remove error')
                    setLoadingCourseTab(false)
                    return
                }
            }
            const response = await fetch(`${API}/courses/${courseId}`,{
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                // body: JSON.stringify({ user_uuid: uuid })
            })
            const deleteCourse = await response.json();
            if(deleteCourse.mStatus!=="ok"){
                setLoadingCourseTab(false)
                alert("Deleting course failed: "+deleteCourse.mMessage);
                return;
            }
            setLoadingCourseTab(false)
            alert("Course deleted.")
            navigate('/courses')
        }catch(error){
            setLoadingCourseTab(false)
            console.log(error.message)
            return
        }
    }
 
    return (
        <div style={{opacity:loadingCourseTab?0.5:1}}>
            <div className = 'loader' style={{display:loadingCourseTab?'flex':'none'}}></div>
            { canManage && (
                <button onClick={()=>editCourseTab()} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginRight: '8px' }}>Edit</button>
            )}
            { canManage && (
                <button onClick={()=>deleteCourseButton(course.courseId, currentUserId, navigate)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e53935', color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Delete</button>
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
 
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                    {[
                        { label: 'Start Time', id: 'editStartTime' },
                        { label: 'End Time', id: 'editEndTime' },
                    ].map((field, index) => (
                        <div key={field.id} style={{ flex: '1 1 180px' }}>
                            <label htmlFor={field.id} style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>{field.label}</label>
                            <select
                                id={field.id}
                                value={editTimes[index]}
                                onChange={e => {
                                    const value = e.target.value;
                                    setEditTimes(previous => index === 0
                                        ? [value, previous[1] && previous[1] <= value ? '' : previous[1]]
                                        : [previous[0], value]);
                                }}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', backgroundColor: '#fff' }}
                            >
                                <option value="">Select {field.label.toLowerCase()}</option>
                                {COURSE_TIME_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} disabled={index === 1 && !!editTimes[0] && option.value <= editTimes[0]}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
 
                <label style={{ marginTop: 0 }}>Start Date</label>
                <input type="date" defaultValue={course.startDate} id="edit_start_date" onClick={e => e.currentTarget.showPicker?.()} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />
                <label style={{ marginTop: 0 }}>Level</label>
                                
                

                
                <label style={{ marginTop: 0 }}>Days of the Week</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                    {DAY_LABELS.map((day, idx) => (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                            <input
                                type="checkbox"
                                id={`editDay-${idx}`}
                                defaultChecked={course.daysOfWeek?.split(',').map(Number).includes(idx)}
                            />
                            {day}
                        </label>
                    ))}
                </div>

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

function UnitSection({
    unit,
    courseId,
    role,
    username,
    instructor,
    unitId,
    courseTitle
}) {
    const [open, setOpen] = useState(false);
    const [openLessons, setOpenLessons] = useState({});
    const [activeVideo, setActiveVideo] = useState(null);

    const [fileLoading, setFileLoading] = useState(false)

    const [lessonsArray, setLessonArray] = useState([]);

    const [showAddLesson, setShowAddLesson] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [addingMaterials, setAddingMaterials] = useState(null);
    const [reorderingLesson, setReorderingLesson] = useState(null);

    const [selectedVideos, setSelectedVideos] = useState({});

    const [fileUpload, setFileUpload] = useState(null);
    const [fileName, setFileName] = useState("No file chosen");

    const [fileUrl, setFileUrl] = useState({});

    const [newLessonTitle, setNewLessonTitle] = useState("");
    const [newLessonDescription, setNewLessonDescription] = useState("");

    const [editLessonTitle, setEditLessonTitle] = useState("");
    const [editLessonDescription, setEditLessonDescription] = useState("");

    const [videoTitles, setVideoTitles] = useState({});

    const canManage = role === "admin" || username === instructor;

    /* -------------------------------------------------------
       LOAD LESSONS
    ------------------------------------------------------- */

    useEffect(() => {
        if (!unit?.lessons) {
            setLessonArray([]);
            return;
        }

        const lessonArr = unit.lessons.map((lesson) => ({
            lessonId: lesson.lessonId,
            lessonTitle: lesson.lessonTitle,
            lessonDescription: lesson.lessonDescription,
            videos: lesson.videos || []
        }));

        setLessonArray(lessonArr);
    }, [unit]);

    /* -------------------------------------------------------
       LOAD VIDEO URLS
    ------------------------------------------------------- */

    useEffect(() => {
        async function getFileUrls() {
            if (!unit?.lessons) {
                setFileUrl({});
                return;
            }

            const urls = {};

            for (const lesson of unit.lessons) {
                if (!lesson.videos) continue;

                for (const video of lesson.videos) {
                    if (!video.driveUrl) continue;

                    if (
                        video.driveUrl.includes(
                            `course/${courseId}/unit/${unitId}/lesson/${lesson.lessonId}`
                        )
                    ) {
                        try {
                            const { data } = supabase.storage
                                .from("course_videos")
                                .getPublicUrl(video.driveUrl);

                            urls[video.videoId] = data?.publicUrl || null;
                        } catch (error) {
                            console.error(error);
                            urls[video.videoId] = null;
                        }
                    } else {
                        urls[video.videoId] = video.driveUrl;
                    }
                }
            }

            setFileUrl(urls);
        }

        getFileUrls();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* -------------------------------------------------------
       LESSON OPEN/CLOSE
    ------------------------------------------------------- */

    function toggleLesson(lessonId) {
        setOpenLessons((prev) => ({
            ...prev,
            [lessonId]: !prev[lessonId]
        }));
    }

    /* -------------------------------------------------------
       FILE SELECTION
    ------------------------------------------------------- */

    function uploadFileHandler(e) {
        const file = e.target.files?.[0];

        if (file) {
            setFileUpload(file);
            setFileName(file.name);
        } else {
            setFileUpload(null);
            setFileName("No file chosen");
        }
    }

    /* -------------------------------------------------------
       ADD LESSON
    ------------------------------------------------------- */

    function addLesson() {
        setShowAddLesson(true);
    }

    function cancelLesson() {
        setShowAddLesson(false);
        setNewLessonTitle("");
        setNewLessonDescription("");
    }

    async function createNewLesson() {
        if (!newLessonTitle.trim()) {
            alert("Enter a lesson title");
            return;
        }

        if (!newLessonDescription.trim()) {
            alert("Enter a lesson description");
            return;
        }

        try {
            const lessonBody = {
                lessonTitle: newLessonTitle.trim(),
                lessonDescription: newLessonDescription.trim()
            };

            const response = await fetch(
                `${API}/course/${courseId}/unit/${unitId}/addlesson`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(lessonBody)
                }
            );

            const lessonData = await response.json();

            if (lessonData.mStatus !== "ok") {
                alert(
                    "Creating lesson failed: " +
                    (lessonData.mMessage || "")
                );
                return;
            }

            const newLesson = {
                lessonId: lessonData.mData,
                lessonTitle: newLessonTitle.trim(),
                lessonDescription: newLessonDescription.trim(),
                videos: []
            };

            setLessonArray((prev) => [...prev, newLesson]);

            cancelLesson();
        } catch (error) {
            console.error(error);
            alert("Creating lesson failed");
        }
    }

    /* -------------------------------------------------------
       EDIT LESSON
    ------------------------------------------------------- */

    function editLessonButton(lesson) {
        setEditingLesson(lesson.lessonId);
        setEditLessonTitle(lesson.lessonTitle);
        setEditLessonDescription(lesson.lessonDescription);
    }

    function closeEditLesson() {
        setEditingLesson(null);
        setEditLessonTitle("");
        setEditLessonDescription("");
    }

    async function sendEditLesson(lId) {
        if (!editLessonTitle.trim()) {
            alert("Title cannot be empty");
            return;
        }

        if (!editLessonDescription.trim()) {
            alert("Description cannot be empty");
            return;
        }

        try {
            const lessonBody = {
                lessonTitle: editLessonTitle.trim(),
                lessonDescription: editLessonDescription.trim()
            };

            const response = await fetch(
                `${API}/edit/lesson/${lId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(lessonBody)
                }
            );

            const data = await response.json();

            if (data.mStatus !== "ok") {
                alert(
                    "Edit lesson failed: " +
                    (data.mMessage || "")
                );
                return;
            }

            setLessonArray((prev) =>
                prev.map((lesson) =>
                    lesson.lessonId === lId
                        ? {
                              ...lesson,
                              lessonTitle: editLessonTitle.trim(),
                              lessonDescription:
                                  editLessonDescription.trim()
                          }
                        : lesson
                )
            );

            closeEditLesson();
        } catch (error) {
            console.error(error);
            alert("Editing lesson failed");
        }
    }

    /* -------------------------------------------------------
       DELETE LESSON
    ------------------------------------------------------- */

    async function deleteLessonButton(lId) {
        const lessonToDelete = lessonsArray.find(
            (lesson) => lesson.lessonId === lId
        );

        if (!lessonToDelete) return;

        const confirmed = window.confirm(
            `Delete "${lessonToDelete.lessonTitle}"?`
        );

        if (!confirmed) return;

        try {
            setFileLoading(true)
            const videosToDelete = (lessonToDelete.videos || [])
                .map((video) => video.driveUrl)
                .filter(
                    (path) =>
                        path &&
                        path !== "empty" &&
                        !path.includes("http")
                );

            if (videosToDelete.length > 0) {
                const { error } = await supabase.storage
                    .from("course_videos")
                    .remove(videosToDelete);

                if (error) {
                    console.error(error);
                    alert("Could not delete lesson files");
                    return;
                }
            }

            const response = await fetch(
                `${API}/delete/lesson/${lId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            const data = await response.json();

            if (data.mStatus !== "ok") {
                alert(
                    "Deleting lesson failed: " +
                    (data.mMessage || "")
                );
                return;
            }

            setLessonArray((prev) =>
                prev.filter((lesson) => lesson.lessonId !== lId)
            );

            setOpenLessons((prev) => {
                const copy = { ...prev };
                delete copy[lId];
                return copy;
            });
            setFileLoading(false)
        } catch (error) {
            console.error(error);
            setFileLoading(false)
            alert("Deleting lesson failed");
        }
    }

    /* -------------------------------------------------------
       ADD VIDEO
    ------------------------------------------------------- */

    function addMaterials(lessonId) {
        setAddingMaterials(lessonId);
    }

    function cancelMaterials() {
        setAddingMaterials(null);
        setFileUpload(null);
        setFileName("No file chosen");
    }

    async function uploadNewMaterials(
        filename,
        filedata,
        lessonId
    ) {
        const title = videoTitles[lessonId]?.trim();

        if (!title) {
            alert("Enter a title for upload");
            return;
        }



        try {
            setFileLoading(true)
            /*
             * QUIZ / LINK WITHOUT FILE
             */
            if (!filedata || filename === "No file chosen") {
                const noVideoBody = {
                    title,
                    filepath: "empty"
                };

                const response = await fetch(
                    `${API}/unit_videos/unit/${unit.unitId}/lesson/${lessonId}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(noVideoBody)
                    }
                );

                const videoData = await response.json();

                if (videoData.mStatus !== "ok") {
                    setFileLoading(false)
                    alert(
                        "Adding video failed: " +
                        (videoData.mMessage || "")
                    );
                    return;
                }

                const newVideo = {
                    videoId: videoData.mData,
                    unitId: unit.unitId,
                    lessonId,
                    title,
                    driveUrl: "empty",
                    duration: null,
                    sortOrder: 0
                };

                setLessonArray((prev) =>
                    prev.map((lesson) =>
                        lesson.lessonId === lessonId
                            ? {
                                  ...lesson,
                                  videos: [
                                      ...(lesson.videos || []),
                                      newVideo
                                  ]
                              }
                            : lesson
                    )
                );

                setVideoTitles((prev) => ({
                    ...prev,
                    [lessonId]: ""
                }));
                setFileLoading(false)
                cancelMaterials();
                return;
            }

            /* ------------------------------------------------
               FILE UPLOAD
            ------------------------------------------------ */

            const videoUUID = crypto.randomUUID();

            const path =
                `course/${courseId}` +
                `/unit/${unit.unitId}` +
                `/lesson/${lessonId}` +
                `/uuid/${videoUUID}` +
                `/${filename}`;

            const videoBody = {
                title,
                filepath: path
            };

            const response = await fetch(
                `${API}/unit_videos/unit/${unit.unitId}/lesson/${lessonId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(videoBody)
                }
            );

            const videoData = await response.json();

            if (videoData.mStatus !== "ok") {
                setFileLoading(false)
                alert(
                    "Adding video failed: " +
                    (videoData.mMessage || "")
                );
                return;
            }

            const { data, error } = await supabase.storage
                .from("course_videos")
                .upload(path, filedata);

            if (error) {
                console.error(error);

                /*
                 * Database entry was created but file upload failed.
                 * You may want a backend rollback endpoint here.
                 */
                setFileLoading(false)
                alert("Video record created, but file upload failed.");
                return;
            }

            if (data) {
                const { data: publicData } =
                    supabase.storage
                        .from("course_videos")
                        .getPublicUrl(path);

                setFileUrl((prev) => ({
                    ...prev,
                    [videoData.mData]:
                        publicData?.publicUrl || null
                }));
            }

            const newVideo = {
                videoId: videoData.mData,
                unitId: unit.unitId,
                lessonId,
                title,
                driveUrl: path,
                duration: null,
                sortOrder: 0
            };

            setLessonArray((prev) =>
                prev.map((lesson) =>
                    lesson.lessonId === lessonId
                        ? {
                              ...lesson,
                              videos: [
                                  ...(lesson.videos || []),
                                  newVideo
                              ]
                          }
                        : lesson
                )
            );

            alert("Added video successfully.");

            setVideoTitles((prev) => ({
                ...prev,
                [lessonId]: ""
            }));
            setFileLoading(false)
            cancelMaterials();
        } catch (error) {
            console.error(error);
            setFileLoading(false)
            alert("Adding video failed");
        }
    }

    /* -------------------------------------------------------
       DELETE VIDEO
    ------------------------------------------------------- */

    async function deleteFile(
        driveurl,
        lessonId,
        videoId
    ) {
        const confirmed = window.confirm(
            "Delete this video?"
        );

        if (!confirmed) return;

        try {
            setFileLoading(true)
            const videoEntry = await fetch(
                `${API}/delete/unit_videos/unit/${unit.unitId}/lesson/${lessonId}/videoId/${videoId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            const videoEntryData =
                await videoEntry.json();

            if (videoEntryData.mStatus !== "ok") {
                setFileLoading(false)
                alert("Deleting video failed");
                return;
            }

            if (
                driveurl &&
                driveurl !== "empty" &&
                !driveurl.includes("http")
            ) {
                const { error } =
                    await supabase.storage
                        .from("course_videos")
                        .remove([driveurl]);

                if (error) {
                    console.error(error);
                }
            }

            setLessonArray((prev) =>
                prev.map((lesson) =>
                    lesson.lessonId === lessonId
                        ? {
                              ...lesson,
                              videos: lesson.videos.filter(
                                  (video) =>
                                      video.videoId !== videoId
                              )
                          }
                        : lesson
                )
            );

            setFileUrl((prev) => {
                const copy = { ...prev };
                delete copy[videoId];
                return copy;
            });

            if (activeVideo === videoId) {
                setActiveVideo(null);
            }
            setFileLoading(false)
        } catch (error) {
            setFileLoading(false)
            console.error(error);
        }
    }

    /* -------------------------------------------------------
       VIDEO REORDER
    ------------------------------------------------------- */

    function toggleVideoSelection(videoId) {
        setSelectedVideos((prev) => ({
            ...prev,
            [videoId]: !prev[videoId]
        }));
    }

    function startReorder(lessonId) {
        setReorderingLesson(lessonId);

        setSelectedVideos((prev) => {
            const copy = { ...prev };

            const lesson = lessonsArray.find(
                (l) => l.lessonId === lessonId
            );

            lesson?.videos?.forEach((video) => {
                copy[video.videoId] = false;
            });

            return copy;
        });
    }

    function cancelReorder() {
        setReorderingLesson(null);
        setSelectedVideos({});
    }

    async function swapVideoId(lId) {
        const lesson = lessonsArray.find(
            (l) => l.lessonId === lId
        );

        if (!lesson) return;

        const selected = (lesson.videos || []).filter(
            (video) => selectedVideos[video.videoId]
        );

        if (selected.length !== 2) {
            alert("Select exactly two videos to swap");
            return;
        }

        const [video1, video2] = selected;

        try {
            const videoTitles = {
                videoTitle1: video1.title,
                videoTitle2: video2.title
            };

            const response = await fetch(
                `${API}/course_units/unit/${unit.unitId}/lesson/${lId}/swap/${video1.videoId}/${video2.videoId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(videoTitles)
                }
            );

            const responseData =
                await response.json();

            if (responseData.mStatus !== "ok") {
                alert(
                    "Swapping failed: " +
                    responseData.mMessage
                );
                return;
            }

            /*
             * Swap locally as well so the UI immediately updates.
             */
            setLessonArray((prev) =>
                prev.map((lessonItem) => {
                    if (lessonItem.lessonId !== lId) {
                        return lessonItem;
                    }

                    const videos = [...lessonItem.videos];

                    const index1 = videos.findIndex(
                        (v) =>
                            v.videoId === video1.videoId
                    );

                    const index2 = videos.findIndex(
                        (v) =>
                            v.videoId === video2.videoId
                    );

                    if (index1 !== -1 && index2 !== -1) {
                        [
                            videos[index1],
                            videos[index2]
                        ] = [
                            videos[index2],
                            videos[index1]
                        ];
                    }

                    return {
                        ...lessonItem,
                        videos
                    };
                })
            );

            cancelReorder();
        } catch (error) {
            console.error(error);
            alert("Could not reorder videos");
        }
    }

    /* -------------------------------------------------------
       NEXT VIDEO
    ------------------------------------------------------- */

    function goToNextVideo(
        lessonId,
        currentVideoId
    ) {
        const currentLesson = lessonsArray.find(
            (lesson) => lesson.lessonId === lessonId
        );

        if (!currentLesson) return;

        const videos = currentLesson.videos || [];

        const idx = videos.findIndex(
            (v) => v.videoId === currentVideoId
        );

        if (
            idx === -1 ||
            idx === videos.length - 1
        ) {
            return;
        }

        setActiveVideo(
            videos[idx + 1].videoId
        );
    }

    /* -------------------------------------------------------
       GA4
    ------------------------------------------------------- */

    function ga4AddView(
        vId,
        vidTitle,
        unitTitle,
        courseTitle
    ) {
        ReactGA.event({
            category: "course videos",
            action:
                "viewed " +
                vidTitle +
                " course " +
                courseTitle +
                " unit " +
                unitTitle,
            label: vId
        });
    }

    /* -------------------------------------------------------
       RENDER
    ------------------------------------------------------- */

    return (
        <div className="materials-unit" style={{opacity:fileLoading? 0.5 : 1}}>

            <div className = 'loader' style={{display:fileLoading?'flex':'none'}}></div>

            {/* ================= UNIT HEADER ================= */}

            <div
                className={`materials-unit-header ${
                    open ? "is-open" : ""
                }`}
                onClick={() => setOpen((prev) => !prev)}
            >
                <div className="materials-unit-header-left">

                    <div
                        className={`materials-icon-badge ${
                            open ? "is-active" : ""
                        }`}
                    >
                        📁
                    </div>

                    <div className="materials-unit-title-group">

                        <div className="materials-unit-title">
                            {unit.title}
                        </div>

                        <div className="materials-unit-subtitle">
                            {lessonsArray.length} lesson
                            {lessonsArray.length !== 1
                                ? "s"
                                : ""}
                        </div>

                    </div>
                </div>

                <span
                    className={`materials-chevron ${
                        open ? "is-open" : ""
                    }`}
                >
                    ›
                </span>
            </div>

            {/* ================= UNIT CONTENT ================= */}

            {open && (
                <div className="materials-unit-body">

                    {/* ADD LESSON BUTTON */}

                    {canManage && !showAddLesson && (
                        <div className="materials-add-unit-row">
                            <button
                                className="materials-icon-btn"
                                onClick={addLesson}
                            >
                                + Add Lesson
                            </button>
                        </div>
                    )}

                    {/* ADD LESSON FORM */}

                    {canManage && showAddLesson && (
                        <div className="materials-add-lesson-form">

                            <label>
                                Lesson Title
                            </label>

                            <input
                                type="text"
                                value={newLessonTitle}
                                onChange={(e) =>
                                    setNewLessonTitle(
                                        e.target.value
                                    )
                                }
                                className="materials-inline-input"
                                placeholder="Enter lesson title"
                            />

                            <label>
                                Lesson Description
                            </label>

                            <textarea
                                value={newLessonDescription}
                                onChange={(e) =>
                                    setNewLessonDescription(
                                        e.target.value
                                    )
                                }
                                className="materials-inline-input"
                                style={{
                                    minHeight: 70
                                }}
                                placeholder="Enter lesson description"
                            />

                            <div
                                style={{
                                    display: "flex",
                                    gap: 8
                                }}
                            >
                                <button
                                    className="materials-icon-btn"
                                    onClick={
                                        createNewLesson
                                    }
                                >
                                    Create Lesson
                                </button>

                                <button
                                    className="materials-icon-btn"
                                    onClick={
                                        cancelLesson
                                    }
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>
                    )}

                    {/* NO LESSONS */}

                    {lessonsArray.length === 0 ? (
                        <div className="materials-empty">
                            No lessons in this unit yet.
                        </div>
                    ) : (

                        /* LESSON LIST */

                        <div className="materials-lesson-list">

                            {lessonsArray.map(
                                (lesson, idx) => {

                                    const isLessonOpen =
                                        !!openLessons[
                                            lesson.lessonId
                                        ];

                                    return (
                                        <div
                                            className="materials-lesson"
                                            key={
                                                lesson.lessonId
                                            }
                                        >

                                            {/* LESSON HEADER */}

                                            <div className="materials-lesson-top">

                                                <div
                                                    style={{
                                                        minWidth: 0
                                                    }}
                                                >
                                                    <div className="materials-lesson-heading">
                                                        Lesson{" "}
                                                        {idx + 1}:{" "}
                                                        {
                                                            lesson.lessonTitle
                                                        }
                                                    </div>

                                                    <div className="materials-lesson-desc">
                                                        {
                                                            lesson.lessonDescription
                                                        }
                                                    </div>
                                                </div>

                                                {canManage && (
                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            gap: 6,
                                                            flexShrink: 0,
                                                            flexWrap:
                                                                "wrap",
                                                            justifyContent:
                                                                "flex-end"
                                                        }}
                                                    >
                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={() =>
                                                                editLessonButton(
                                                                    lesson
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            className="materials-icon-btn danger"
                                                            onClick={() =>
                                                                deleteLessonButton(
                                                                    lesson.lessonId
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}

                                            </div>

                                            {/* EDIT LESSON */}

                                            {editingLesson ===
                                                lesson.lessonId && (
                                                <div className="materials-add-lesson-form">

                                                    <label>
                                                        Lesson
                                                        Title
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={
                                                            editLessonTitle
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            setEditLessonTitle(
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        className="materials-inline-input"
                                                    />

                                                    <label>
                                                        Lesson
                                                        Description
                                                    </label>

                                                    <textarea
                                                        value={
                                                            editLessonDescription
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            setEditLessonDescription(
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        className="materials-inline-input"
                                                        style={{
                                                            minHeight: 70
                                                        }}
                                                    />

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            gap: 8
                                                        }}
                                                    >
                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={() =>
                                                                sendEditLesson(
                                                                    lesson.lessonId
                                                                )
                                                            }
                                                        >
                                                            Save
                                                        </button>

                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={
                                                                closeEditLesson
                                                            }
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>

                                                </div>
                                            )}

                                            {/* LESSON TOOLBAR */}

                                            {canManage && (
                                                <div className="materials-lesson-toolbar">

                                                    <button
                                                        className="materials-icon-btn"
                                                        onClick={() =>
                                                            addingMaterials ===
                                                            lesson.lessonId
                                                                ? cancelMaterials()
                                                                : addMaterials(
                                                                      lesson.lessonId
                                                                  )
                                                        }
                                                    >
                                                        {addingMaterials ===
                                                        lesson.lessonId
                                                            ? "Cancel"
                                                            : "+ Add File"}
                                                    </button>

                                                    {reorderingLesson !==
                                                    lesson.lessonId ? (
                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={() =>
                                                                startReorder(
                                                                    lesson.lessonId
                                                                )
                                                            }
                                                        >
                                                            Reorder Videos
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="materials-icon-btn"
                                                                onClick={() =>
                                                                    swapVideoId(
                                                                        lesson.lessonId
                                                                    )
                                                                }
                                                            >
                                                                Swap Selected
                                                            </button>

                                                            <button
                                                                className="materials-icon-btn"
                                                                onClick={
                                                                    cancelReorder
                                                                }
                                                            >
                                                                Cancel Reorder
                                                            </button>
                                                        </>
                                                    )}

                                                </div>
                                            )}

                                            {/* ADD VIDEO */}

                                            {addingMaterials ===
                                                lesson.lessonId && (
                                                <div className="materials-add-lesson-form">

                                                    <label>
                                                        Select
                                                        File
                                                    </label>

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 10
                                                        }}
                                                    >

                                                        <input
                                                            type="file"
                                                            id={`hiddenAddFileInput-${lesson.lessonId}`}
                                                            onChange={
                                                                uploadFileHandler
                                                            }
                                                            style={{
                                                                display:
                                                                    "none"
                                                            }}
                                                        />

                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={() =>
                                                                document
                                                                    .getElementById(
                                                                        `hiddenAddFileInput-${lesson.lessonId}`
                                                                    )
                                                                    .click()
                                                            }
                                                        >
                                                            Choose File
                                                        </button>

                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    13,
                                                                color:
                                                                    "#6d6877",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis"
                                                            }}
                                                        >
                                                            {
                                                                fileName
                                                            }
                                                        </span>

                                                    </div>

                                                    <label>
                                                        Video / Quiz
                                                        Title
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={
                                                            videoTitles[
                                                                lesson
                                                                    .lessonId
                                                            ] || ""
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            setVideoTitles(
                                                                (
                                                                    prev
                                                                ) => ({
                                                                    ...prev,
                                                                    [lesson.lessonId]:
                                                                        e
                                                                            .target
                                                                            .value
                                                                })
                                                            )
                                                        }
                                                        className="materials-inline-input"
                                                        placeholder="Enter title"
                                                    />

                                                    {fileUpload && (
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    12,
                                                                color:
                                                                    "#6d6877"
                                                            }}
                                                        >
                                                            Selected:{" "}
                                                            {
                                                                fileUpload.name
                                                            }
                                                        </div>
                                                    )}

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            gap: 8
                                                        }}
                                                    >
                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={() =>
                                                                uploadNewMaterials(
                                                                    fileName,
                                                                    fileUpload,
                                                                    lesson.lessonId
                                                                )
                                                            }
                                                        >
                                                            Upload
                                                        </button>

                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={
                                                                cancelMaterials
                                                            }
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>

                                                </div>
                                            )}

                                            {/* REORDER LIST */}

                                            {reorderingLesson ===
                                                lesson.lessonId && (
                                                <div
                                                    style={{
                                                        padding:
                                                            "8px 16px 12px"
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            fontSize:
                                                                12,
                                                            color:
                                                                "#97919c",
                                                            marginBottom:
                                                                8
                                                        }}
                                                    >
                                                        Select exactly
                                                        two videos to
                                                        swap.
                                                    </div>

                                                    {(
                                                        lesson.videos ||
                                                        []
                                                    )
                                                        .slice()
                                                        .map(
                                                            (
                                                                video
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        video.videoId
                                                                    }
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: 10,
                                                                        padding:
                                                                            "6px 0"
                                                                    }}
                                                                >

                                                                    <button
                                                                        className="materials-icon-btn"
                                                                        onClick={() =>
                                                                            toggleVideoSelection(
                                                                                video.videoId
                                                                            )
                                                                        }
                                                                    >
                                                                        {selectedVideos[
                                                                            video
                                                                                .videoId
                                                                        ]
                                                                            ? "✓"
                                                                            : "○"}
                                                                    </button>

                                                                    <span>
                                                                        {
                                                                            video.title
                                                                        }
                                                                    </span>

                                                                </div>
                                                            )
                                                        )}

                                                </div>
                                            )}

                                            {/* LESSON CLICK HEADER */}

                                            <div
                                                className={`materials-video-row ${
                                                    isLessonOpen
                                                        ? "is-active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    toggleLesson(
                                                        lesson.lessonId
                                                    )
                                                }
                                                style={{
                                                    margin:
                                                        "0 16px 8px"
                                                }}
                                            >

                                                <div className="materials-video-play">
                                                    {isLessonOpen
                                                        ? "−"
                                                        : "+"}
                                                </div>

                                                <div
                                                    style={{
                                                        flex: 1
                                                    }}
                                                >
                                                    <div className="materials-video-title">
                                                        Lesson
                                                        materials
                                                    </div>

                                                    <div className="materials-video-meta">
                                                        {
                                                            lesson
                                                                .videos
                                                                ?.length ||
                                                            0
                                                        }{" "}
                                                        video
                                                        {(
                                                            lesson
                                                                .videos
                                                                ?.length ||
                                                            0
                                                        ) !== 1
                                                            ? "s"
                                                            : ""}
                                                    </div>
                                                </div>

                                                <span
                                                    className={`materials-chevron ${
                                                        isLessonOpen
                                                            ? "is-open"
                                                            : ""
                                                    }`}
                                                >
                                                    ›
                                                </span>

                                            </div>

                                            {/* VIDEOS */}

                                            {isLessonOpen && (
                                                <div className="materials-lesson-body">

                                                    {(
                                                        lesson.videos ||
                                                        []
                                                    ).length === 0 ? (
                                                        <div className="materials-empty">
                                                            No videos
                                                            in this
                                                            lesson
                                                            yet.
                                                        </div>
                                                    ) : (
                                                        <div className="materials-video-list">

                                                            {lesson.videos.map(
                                                                (
                                                                    video
                                                                ) => {

                                                                    const isActive =
                                                                        activeVideo ===
                                                                        video.videoId;

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                video.videoId
                                                                            }
                                                                        >

                                                                            {/* VIDEO ROW */}

                                                                            <div
                                                                                className={`materials-video-row ${
                                                                                    isActive
                                                                                        ? "is-active"
                                                                                        : ""
                                                                                }`}
                                                                                onClick={() => {
                                                                                    setActiveVideo(
                                                                                        isActive
                                                                                            ? null
                                                                                            : video.videoId
                                                                                    );

                                                                                    ga4AddView(
                                                                                        video.videoId,
                                                                                        video.title,
                                                                                        unit.title,
                                                                                        courseTitle
                                                                                    );
                                                                                }}
                                                                            >

                                                                                <div className="materials-video-play">
                                                                                    ▶
                                                                                </div>

                                                                                <div
                                                                                    style={{
                                                                                        flex: 1,
                                                                                        minWidth: 0
                                                                                    }}
                                                                                >
                                                                                    <div className="materials-video-title">
                                                                                        {
                                                                                            video.title
                                                                                        }
                                                                                    </div>

                                                                                    {video.duration && (
                                                                                        <div className="materials-video-meta">
                                                                                            {
                                                                                                video.duration
                                                                                            }
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {canManage && (
                                                                                    <button
                                                                                        className="materials-icon-btn danger"
                                                                                        onClick={(
                                                                                            e
                                                                                        ) => {
                                                                                            e.stopPropagation();

                                                                                            deleteFile(
                                                                                                video.driveUrl,
                                                                                                lesson.lessonId,
                                                                                                video.videoId
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Delete
                                                                                    </button>
                                                                                )}

                                                                                <span
                                                                                    className={`materials-chevron ${
                                                                                        isActive
                                                                                            ? "is-open"
                                                                                            : ""
                                                                                    }`}
                                                                                >
                                                                                    ›
                                                                                </span>

                                                                            </div>

                                                                            {/* VIDEO PLAYER */}

                                                                            {isActive && (
                                                                                <div
                                                                                    style={{
                                                                                        background:
                                                                                            "#f5c8f3",
                                                                                        borderRadius:
                                                                                            8,
                                                                                        overflow:
                                                                                            "hidden",
                                                                                        marginBottom:
                                                                                            8
                                                                                    }}
                                                                                >

                                                                                    {video.driveUrl &&
                                                                                    !video.driveUrl.includes(
                                                                                        "FILE_ID"
                                                                                    ) &&
                                                                                    video.driveUrl !==
                                                                                        "empty" ? (
                                                                                        fileUrl[
                                                                                            video
                                                                                                .videoId
                                                                                        ] ? (
                                                                                            <iframe
                                                                                                src={
                                                                                                    fileUrl[
                                                                                                        video
                                                                                                            .videoId
                                                                                                    ]
                                                                                                }
                                                                                                width="100%"
                                                                                                height="600"
                                                                                                allow="autoplay"
                                                                                                style={{
                                                                                                    border:
                                                                                                        "none",
                                                                                                    display:
                                                                                                        "block"
                                                                                                }}
                                                                                                title={
                                                                                                    video.title
                                                                                                }
                                                                                            />
                                                                                        ) : (
                                                                                            <div
                                                                                                style={{
                                                                                                    height: 220,
                                                                                                    display:
                                                                                                        "flex",
                                                                                                    alignItems:
                                                                                                        "center",
                                                                                                    justifyContent:
                                                                                                        "center",
                                                                                                    color:
                                                                                                        "#777"
                                                                                                }}
                                                                                            >
                                                                                                Loading video...
                                                                                            </div>
                                                                                        )
                                                                                    ) : (
                                                                                        <div
                                                                                            style={{
                                                                                                height: 220,
                                                                                                display:
                                                                                                    "flex",
                                                                                                flexDirection:
                                                                                                    "column",
                                                                                                alignItems:
                                                                                                    "center",
                                                                                                justifyContent:
                                                                                                    "center",
                                                                                                color:
                                                                                                    "#666",
                                                                                                gap: 10
                                                                                            }}
                                                                                        >

                                                                                            <a
                                                                                                href={
                                                                                                    video.title
                                                                                                }
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                style={{
                                                                                                    fontSize:
                                                                                                        18,
                                                                                                    color:
                                                                                                        "#6C63FF",
                                                                                                    fontWeight:
                                                                                                        700
                                                                                                }}
                                                                                            >
                                                                                                Take your quiz
                                                                                                here
                                                                                            </a>

                                                                                            <span
                                                                                                style={{
                                                                                                    fontSize:
                                                                                                        13
                                                                                                }}
                                                                                            >
                                                                                                Click
                                                                                                the
                                                                                                link
                                                                                                to
                                                                                                take
                                                                                                your
                                                                                                quiz.
                                                                                            </span>

                                                                                        </div>
                                                                                    )}

                                                                                    {/* NEXT VIDEO */}

                                                                                    {lesson.videos.findIndex(
                                                                                        (
                                                                                            v
                                                                                        ) =>
                                                                                            v.videoId ===
                                                                                            video.videoId
                                                                                    ) <
                                                                                        lesson
                                                                                            .videos
                                                                                            .length -
                                                                                            1 && (
                                                                                        <div
                                                                                            style={{
                                                                                                padding:
                                                                                                    "12px 16px",
                                                                                                display:
                                                                                                    "flex",
                                                                                                justifyContent:
                                                                                                    "flex-end"
                                                                                            }}
                                                                                        >

                                                                                            <button
                                                                                                className="materials-icon-btn"
                                                                                                onClick={() =>
                                                                                                    goToNextVideo(
                                                                                                        lesson.lessonId,
                                                                                                        video.videoId
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                Next Video
                                                                                                ›
                                                                                            </button>

                                                                                        </div>
                                                                                    )}

                                                                                </div>
                                                                            )}

                                                                        </div>
                                                                    );
                                                                }
                                                            )}

                                                        </div>
                                                    )}

                                                </div>
                                            )}

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

 
function MaterialsTab({ course, userData }) {

    const[unitArr, setUnitArr]=useState([])
    const [editingUnits, setEditingUnits] = useState(false);
    const canManageUnits = userData?.role === "admin" || userData?.username === course.instructor;
    // const [isDraggable, setIsDraggable] = useState(false)

    // console.log('course =',course)

    useEffect(()=>{
        const array = course?.units.map((unit)=>{
            return {unitId: unit.unitId, courseId: course.courseId, title: unit.title, sortOrder: unit.sortOrder, lessons: unit?.lessons}
        })
        setUnitArr(array)
    },[course])

    function addUnitDom(newId){
        const newUnit=[{ unitId: newId, courseId: course.courseId, 
            title:document.getElementById("unitName").value, sortOrder: unitArr.length, lessons: []}]
        setUnitArr((prevUnits)=>{ return [...prevUnits,...newUnit] })
    }
    function newUnitButton() {
        if(document.getElementById("addUnit").style.display === "block"){
            document.getElementById("addUnit").style.display = "none"
        }
        else{
            document.getElementById("addUnit").style.display = "block"
        }
    }
    function cancelNewUnit() {
        document.getElementById("addUnit").style.display = "none";
    }
    async function submitNewUnit(courseId) {
        if (!document.getElementById("unitName").value) { alert("Please enter a unit name"); return; }
        try {
            const unitBody = { unitName: document.getElementById("unitName").value, sortOrder: unitArr.length };
            const response = await fetch(`${API}/course_units/${courseId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(unitBody) });
            const data = await response.json();
            if (data.mStatus !== "ok") { alert("Adding unit failed: " + data.mMessage); return; }
            // console.log('new unitId =',data.mData)
            addUnitDom(data.mData)
        } catch (error) { console.log(error.message); }
    }
    async function sendDeleteUnits(unitId){
        const unit = unitArr.find(item => item.unitId === unitId);
        if (!unit || !window.confirm(`Delete "${unit.title}" and its contents? This cannot be undone.`)) return;
        try{
            const unitsToKeep = unitArr.filter((unit)=> unit.unitId !== unitId)
            // console.log('unitsToKeep =',unitsToKeep)

            const unitIdsToDelete = unitArr.filter((unit)=>unit.unitId === unitId).map((unit)=>{return unit.unitId})
            // console.log('unitsIdsToDelete =',unitIdsToDelete)

            const videosToDelete = unitArr.filter((unit)=>unit.unitId === unitId)?.flatMap(unit=>unit?.lessons.flatMap((lesson)=>lesson?.videos.flatMap((video)=> {console.log('video =',video); return video.driveUrl})))
            // console.log('videostodelete= ',videosToDelete)

            if(videosToDelete.length!==0){
                const { data, removeError } = await supabase.storage.from('course_videos').remove(videosToDelete);
                if(removeError || !data){
                    console.log('remove error =',removeError)
                    return
                }
                else{
                    console.log('data=',data)
                }
            }

            const deleteUnitResponse = await fetch(`${API}/delete/units/course/${course.courseId}`,{
                method:"POST",
                headers: { "Content-Type": "application/json" },
                body: unitIdsToDelete
            })
            const deleteUnitData = await deleteUnitResponse.json()
            if (deleteUnitData.mStatus !== "ok") { alert("deleting unit failed: " + deleteUnitData.mMessage); return; }
            setUnitArr(unitsToKeep)
        }catch(error){
            console.log(error.message)
        }
    }
    // function swapUnitsButton(){
    //     // document.getElementById("swapUnit").style.display="block"
    //     setIsDraggable(!isDraggable)
    // }

    // function cancelOrderChange(){
    //     setIsDraggable(!isDraggable)
    // }
    // function confirmOrderChange(){
    //     setIsDraggable(!isDraggable)
    // }

    let uId1='-1'
    let uId2='-1'

    let sortNum1 = '-1'
    let sortNum2 = '-1'

    async function swapUnits(){
        try{
            const units = [uId1, uId2, sortNum1, sortNum2]
            const swapResponse = await fetch(`${API}/course/${course.courseId}/swapunits`,{
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: units
            })
            const swapData = await swapResponse.json()
            if(swapData.mStatus !== "ok"){ console.log('swapping units mstatus = ',swapData.mStatus) }
            return
        }catch(error){
            console.log('swapping units failed ',error.message)
        }

        uId1=-1
        uId2=-1

        sortNum1 = -1
        sortNum2 = -1
    }

    function handleStartDrag(uId, sort){
        // console.log('event =',event)
        const drag = document.getElementById(`dragUnit-${uId}`)
        drag.style.opacity=0.33
        // console.log("drag start for ",uId)
        uId1=uId
        sortNum1 = sort
        // console.log('uId1 = ',uId1)
        // console.log('sort1 = ',sortNum1)
    }
    function handleDrag(uId){
        console.log("drag for ",uId)
    }
    function handleDragOver(event, uId, sort){
        event.preventDefault()
        // console.log('drag over ',uId)
        uId2=uId
        sortNum2 = sort
        // console.log('uId2 = ',uId2)
        // console.log('sort2 = ',sortNum2)
    }
    function handleDragEnd(uId){
        const drag = document.getElementById(`dragUnit-${uId}`)
        drag.style.opacity=1
        // console.log('drag end ',uId)
        // console.log('uIds to swap are '+uId1+' and '+uId2)
        if(uId1===-1 || uId2===-1 || uId1===uId2){
            // console.log('swap failed')
            uId1 = -1
            uId2 = -1

            sortNum1=-1
            sortNum2 = -1
            return
        }
        else{
            // console.log('unit id 1 = ',uId1)
            // console.log('unit id 2 = ',uId2)
            let id1Changed = false
            let id2Changed = false

            // console.log('old unit order = ',unitArr)

            const newUnitOrder = unitArr.map((unit)=>{
                if(unit.unitId===uId1 && !id1Changed){
                    id1Changed = !id1Changed
                    return {unitId: unit.unitId, courseId: unit.courseId, title: unit.title, 
                        sortOrder: sortNum2, lessons: unit.lessons}
                }
                else if(unit.unitId===uId2 && !id2Changed){
                    id2Changed= !id2Changed
                    return {unitId: unit.unitId, courseId: unit.courseId, title: unit.title, 
                        sortOrder: sortNum1, lessons: unit.lessons}
                }
                else{
                    return unit
                }
            })
            // console.log('old unit order = ',unitArr)
            // console.log('new unit order = ',newUnitOrder)
            // console.log('new unit order = ',unitArr)
            setUnitArr(newUnitOrder)
            swapUnits()
        }
    }
    
    const location = useLocation();
    if (!unitArr || unitArr.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '15px' }}>
                No materials available yet.
                <div style={{ marginTop: '20px' }}>
                    { (userData?.role==="admin" || userData?.username===course.instructor) && (<>
                        <button onClick={() => setEditingUnits(!editingUnits)} aria-expanded={editingUnits} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>{editingUnits ? 'Done Editing Units' : 'Edit Unit'}</button>
                        <div hidden={!editingUnits}>
                        <button onClick={newUnitButton} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Add a New Unit</button>
                        </div>
                    </>)}
                    <div hidden={!editingUnits || !canManageUnits}>
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
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '15px' }}>
                { (userData?.role==="admin" || userData?.username===course.instructor) && (
                    <div>
                        <button onClick={() => setEditingUnits(!editingUnits)} aria-expanded={editingUnits} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>{editingUnits ? 'Done Editing Units' : 'Edit Unit'}</button>
                    <div id ="unitButtons" hidden={!editingUnits}>
                        <button onClick={newUnitButton} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Add a New Unit</button>
                        {/* <button onClick={swapUnitsButton} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Edit Unit Order</button> */}
                    </div>
                    </div>
                )}
                <div hidden={!editingUnits || !canManageUnits}>
                <div id="addUnit" style={{display: 'none'}}>
                        <label style={{ marginTop: 0 }}>Unit name</label>
                        <input type="text" id="unitName" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />
 
                        <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={()=>submitNewUnit(course.courseId)}>Create</button>
                        <button variant="secondary" onClick={cancelNewUnit}>Cancel</button>
                    </div>
                </div>
                {/* <div id ="swapUnit" style={{display:isDraggable? 'block' : 'none'}}>
                    <div style={{padding:'10px'}}>
                        <label style={{fontSize: '25px'}}>Click and drag the units to change the order.</label>
                    </div>
                    <button onClick={()=>confirmOrderChange}>Save</button>
                    <button variant="secondary" onClick={cancelOrderChange}>Cancel</button>
                </div> */}
            </div>
            </div>
            {unitArr.sort((a,b)=>a.sortOrder-b.sortOrder).map(unit => 
                <div id={`dragUnit-${unit.unitId}`} key={unit.unitId} draggable={ (userData?.role==="admin" || userData?.username===course.instructor)? "true": "false"} onDragStart={()=>handleStartDrag(unit.unitId, unit.sortOrder)} onDrag={()=>handleDrag(unit.unitId)} onDragOver={(e)=>handleDragOver(e,unit.unitId, unit.sortOrder)} onDragEnd={()=>handleDragEnd(unit.unitId)}>
                    <UnitMaterials key={unit.unitId} unit={unit} canManage={canManageUnits && editingUnits} onDelete={() => sendDeleteUnits(unit.unitId)} onTitleChange={title => setUnitArr(units => units.map(item => item.unitId === unit.unitId ? { ...item, title } : item))} initialOpen={location.state?.unitId === unit.unitId} initialTab={location.state?.unitId === unit.unitId ? location.state?.unitTab || 'videos' : 'videos'}>
                        <UnitSection embedded unit={unit} courseId = {course.courseId} role ={userData?.role} username={userData?.username} instructor={course.instructor} unitId={unit.unitId} courseTitle={course.title}/>
                    </UnitMaterials>
                </div>
            )}
        </div>
    );
}
 
function CourseDetail() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
 
    const [currentUserId, setCurrentUserId] = useState(null);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(['video', 'materials'].includes(location.state?.activeTab) ? location.state.activeTab : 'course');
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
 

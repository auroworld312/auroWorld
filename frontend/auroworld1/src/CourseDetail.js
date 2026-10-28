import LessonLiveLinks from './LessonLiveLinks';
import NextClass from './NextClass';
import { UnitQuizzes } from './QuizComponents';
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
// import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReactGA from "react-ga4";
import UnitMaterials from './UnitMaterials';
import UnitForm from './UnitForm';
import './spinner/spin.css'
import './CourseInfo.css';
import CourseEnrollment, { CourseOverview } from './CourseEnrollment';
import VideoTab, { RoomChatPreview } from './LiveClassPreview';
import { getCourseTimeValues } from './courseSchedule';
import { uploadToB2, getB2Url, deleteFromB2, isB2, toKey, B2_PREFIX, isVideoFile, safeSegment } from './b2Storage';
import {supabase} from './utils/supabaseClient.js'


async function authToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
}

// True only for real external links (e.g. a quiz URL), never for B2/Supabase storage paths
const isExternalUrl = p => /^https?:\/\//i.test(p || '');

// Deletes files from whichever storage they live in (old Supabase files or new B2 files)
async function removeStoredFiles(paths) {
    const b2Keys = paths.filter(isB2).map(toKey);
    const supabasePaths = paths.filter(p => p && p !== 'empty' && !isB2(p));
    await deleteFromB2(b2Keys, authToken);
    if (supabasePaths.length) {
        const { error } = await supabase.storage.from('course_videos').remove(supabasePaths);
        if (error) throw error;
    }
}

const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';
const PURPLE = '#6C63FF';
const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const COURSE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? '00' : '30';
    return {
        value: `${String(hour).padStart(2, '0')}:${minute}`,
        label: `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`,
    };
});


function TabButton({ label, active, onClick }) {
    return (
        <button aria-pressed={active} onClick={onClick} style={{
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


function CourseTab({ course, userData, navigate }) {
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
                daysOfWeek: selectedDays.join(',')
            }
            const response=await fetch(`${API}/courses/edit/${courseId}`,{
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editCourseBody)
            })
            const data = await response.json();
            if(data.mStatus!=="ok"){
                setLoadingCourseTab(false)
                alert("Adding course failed: "+data.mMessage);
                return;
            }
            alert("Saved")
            cancelEditCourseTab()
            window.location.reload();
            return
        }catch(error){
            setLoadingCourseTab(false)
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
            const pathsRes = await fetch(`${API}/filepaths/course/${courseId}`)
            const pathsData = await pathsRes.json()
            const paths = (pathsData.mData || []).filter(p => p && p !== 'empty' && !isExternalUrl(p))

            // Delete the stored files first; if that fails, keep the course so it can be retried
            if (paths.length > 0) {
                try {
                    await removeStoredFiles(paths)
                } catch (err) {
                    console.error(err)
                    alert('Could not delete the course files from storage: ' + err.message + '\nThe course was not deleted.')
                    return
                }
            }

            const response = await fetch(`${API}/courses/${courseId}`, { method: "DELETE", headers: { "Content-Type": "application/json" } })
            const deleteCourse = await response.json();
            if(deleteCourse.mStatus!=="ok"){
                alert("Deleting course failed: "+deleteCourse.mMessage);
                return;
            }
            alert("Course deleted.")
            navigate('/courses')
        }catch(error){
            console.log(error.message)
        } finally {
            setLoadingCourseTab(false)
        }
    }

    return (
        <div style={{opacity:loadingCourseTab?0.5:1}}>
            <div className = 'loader' style={{display:loadingCourseTab?'flex':'none'}}></div>
            { canManage && (
                <button hidden onClick={()=>editCourseTab()} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginRight: '8px' }}>Edit</button>
            )}
            { canManage && (
                <button hidden onClick={()=>deleteCourseButton(course.courseId, navigate)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e53935', color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Delete</button>
            )}
            <CourseOverview course={course} />
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

                <label style={{ marginTop: 0 }}>Zoom Link</label>
                <input type="text" defaultValue={course.liveUrl} id="editLiveUrl" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }} />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => sendEditCourseTabButton(course.courseId)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Send</button>
                    <button onClick={() => cancelEditCourseTab()} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export function UnitSection({
    unit,
    courseId,
    role,
    username,
    instructor,
    unitId,
    courseTitle,
    liveUrl,
    initialLessonId,
    initialLessonTab,
    embedded = false,
    onLessonsChange,
    requestLessonEditor
}) {
    const [open, setOpen] = useState(false);
    const [openLessons, setOpenLessons] = useState(initialLessonId ? { [initialLessonId]: true } : {});
    const [lessonTabs, setLessonTabs] = useState({});
    const [quizRevision, setQuizRevision] = useState(0);
    let lessonLiveUrl = '';
    try { const url = new URL((liveUrl || '').trim()); if (['http:', 'https:'].includes(url.protocol)) lessonLiveUrl = url.href; } catch {}
    const [activeVideo, setActiveVideo] = useState(null);

    const [fileLoading, setFileLoading] = useState(false)

    const [lessonsArray, setLessonArray] = useState(unit?.lessons || []);

    const [showAddLesson, setShowAddLesson] = useState(false);
    const [lessonSearch, setLessonSearch] = useState('');
    const [lessonMenu, setLessonMenu] = useState(null);
    const [quizDraftOpen, setQuizDraftOpen] = useState(false);
    const [liveDraftOpen, setLiveDraftOpen] = useState(false);
    const [lessonCount, setLessonCount] = useState(1);
    const [creatingLessons, setCreatingLessons] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [addingMaterials, setAddingMaterials] = useState(null);
    const [reorderingLesson, setReorderingLesson] = useState(null);

    const [selectedVideos, setSelectedVideos] = useState({});

    const [fileUpload, setFileUpload] = useState(null);
    const [fileName, setFileName] = useState("No video selected");

    const [fileUrl, setFileUrl] = useState({});

    const [lessonTitles, setLessonTitles] = useState(['']);

    const [editLessonTitle, setEditLessonTitle] = useState("");
    const [editLessonDescription, setEditLessonDescription] = useState("");

    const [videoTitles, setVideoTitles] = useState({});

    const canManage = role === "admin" || (!!username && username === instructor);

    /* LOAD LESSONS */

    useEffect(() => {
        if (!unit?.lessons) {
            setLessonArray([]);
            return;
        }

        const lessonArr = unit.lessons.map((lesson) => ({
            lessonId: lesson.lessonId,
            unitId: lesson.unitId,
            lessonTitle: lesson.lessonTitle,
            lessonDescription: lesson.lessonDescription,
            sortOrder: lesson.sortOrder,
            videos: lesson.videos || []
        }));

        setLessonArray(lessonArr);
    }, [unit]);

    useEffect(() => {
        if (onLessonsChange && JSON.stringify(lessonsArray) !== JSON.stringify(unit.lessons || [])) onLessonsChange(lessonsArray);
    }, [lessonsArray, onLessonsChange, unit.lessons]);

    /* LOAD VIDEO URLS (old Supabase files) */

    const fileUrlGrabbed = useRef(false)
    useEffect(() => {
        if(fileUrlGrabbed.current===false){
            async function getFileUrls() {
                if (!unit?.lessons) {
                    setFileUrl({});
                    return;
                }

                const urls = {};

                for (const lesson of unit.lessons) {
                    if (!lesson.videos) continue;

                    for (const video of lesson.videos) {
                        if (isB2(video.driveUrl)) continue;

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
        }
        return ()=>{
            fileUrlGrabbed.current=true
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* LOAD SIGNED URL FOR B2 VIDEO WHEN OPENED */

    useEffect(() => {
        if (!activeVideo) return;
        const video = lessonsArray.flatMap(l => l.videos || []).find(v => v.videoId === activeVideo);
        if (!video || !isB2(video.driveUrl)) return;
        let cancelled = false;
        getB2Url(toKey(video.driveUrl), authToken)
            .then(url => { if (!cancelled) setFileUrl(prev => ({ ...prev, [video.videoId]: url })); })
            .catch(err => { console.error(err); alert('Could not load this file: ' + err.message); });
        return () => { cancelled = true; };
    }, [activeVideo, lessonsArray]);

    /* LESSON OPEN/CLOSE */

    function toggleLesson(lessonId) {
        if (openLessons[lessonId] && editingLesson === lessonId && !closeEditLesson()) return;
        setOpenLessons((prev) => ({
            ...prev,
            [lessonId]: !prev[lessonId]
        }));
    }

    /* FILE SELECTION */

    function uploadFileHandler(e, lessonId) {
        const file = e.target.files?.[0];

        if (file) {
            if (!file.type.startsWith('video/') && !isVideoFile(file.name)) {
                alert('Please select a video file, such as MP4, MOV or WebM.');
                e.target.value = '';
                return;
            }
            setFileUpload(file);
            setFileName(file.name);
            setVideoTitles(previous => ({ ...previous, [lessonId]: previous[lessonId] || file.name.replace(/\.[^.]+$/, '') }));
        } else {
            setFileUpload(null);
            setFileName("No video selected");
        }
    }

    /* ADD LESSON */

    function addLesson() {
        setShowAddLesson(true);
    }

    function cancelLesson() {
        setShowAddLesson(false);
        setLessonTitles(['']);
        setLessonCount(1);
    }

    async function createNewLesson() {
        if (!canManage || creatingLessons) return;
        setCreatingLessons(true);
        let completed = 0;
        const firstOrder = Math.max(-1, ...lessonsArray.map(lesson => Number(lesson.sortOrder) || 0)) + 1;
        try {
            // return
            for (let index = 0; index < lessonCount; index++) {
                const title = lessonTitles[index]?.trim() || `Lesson ${firstOrder + index + 1}`;
                const response = await fetch(`${API}/course/${courseId}/unit/${unitId}/addlesson/${firstOrder + index}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lessonTitle: title, lessonDescription: '' })
                });
                const data = await response.json();
                if (data.mStatus !== 'ok') throw new Error(data.mMessage || 'Could not create lesson.');
                setLessonArray(previous => [...previous, { lessonId: data.mData, unitId, lessonTitle: title, lessonDescription: '', sortOrder: firstOrder + index, videos: [] }]);
                completed++;
            }
            cancelLesson();
            setLessonCount(1);
            setLessonSearch('');
        } catch (error) {
            setLessonCount(lessonCount - completed);
            setLessonTitles(lessonTitles.slice(completed));
            alert(`${completed} lesson(s) created. ${error.message} Please retry the remaining lessons.`);
        } finally { setCreatingLessons(false); }
    }

    /* EDIT LESSON */

    function canLeaveLessonEditor() {
        if (fileLoading) return false;
        const current = lessonsArray.find(item => item.lessonId === editingLesson);
        const dirty = current && (editLessonTitle !== current.lessonTitle || addingMaterials === editingLesson || quizDraftOpen || liveDraftOpen);
        return !dirty || window.confirm('Discard unsaved lesson changes? Saved videos and quizzes will be kept.');
    }

    const editorExitRef = useRef(null);
    editorExitRef.current = () => closeEditLesson();

    function editLessonButton(lesson) {
        if (!canLeaveLessonEditor()) return;
        if (requestLessonEditor && !requestLessonEditor(`${unitId}:${lesson.lessonId}`, () => editorExitRef.current())) return;
        setLessonMenu(null);
        setQuizDraftOpen(false);
        setLiveDraftOpen(false);
        setEditingLesson(lesson.lessonId);
        setOpenLessons(current => ({ ...current, [lesson.lessonId]: true }));
        cancelMaterials();
        setEditLessonTitle(lesson.lessonTitle);
        setEditLessonDescription(lesson.lessonDescription || "");
    }

    function closeEditLesson(force = false) {
        if (force !== true && !canLeaveLessonEditor()) return false;
        setQuizDraftOpen(false);
        setLiveDraftOpen(false);
        setEditingLesson(null);
        cancelMaterials();
        setEditLessonTitle("");
        setEditLessonDescription("");
        return true;
    }

    async function sendEditLesson(lId) {
        if (!editLessonTitle.trim()) {
            alert("Title cannot be empty");
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
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(lessonBody)
                }
            );

            const data = await response.json();

            if (data.mStatus !== "ok") {
                alert("Edit lesson failed: " + (data.mMessage || ""));
                return;
            }

            setLessonArray((prev) =>
                prev.map((lesson) =>
                    lesson.lessonId === lId
                        ? {
                              ...lesson,
                              lessonTitle: editLessonTitle.trim(),
                              lessonDescription: editLessonDescription.trim()
                          }
                        : lesson
                )
            );

            // Keep content editing open after saving the lesson name.
        } catch (error) {
            console.error(error);
            alert("Editing lesson failed");
        }
    }

    /* DELETE LESSON */

    async function deleteLessonButton(lId) {
        const lessonToDelete = lessonsArray.find(l => l.lessonId === lId);
        if (!lessonToDelete) return;
        if (!window.confirm(`Delete "${lessonToDelete.lessonTitle}" and its videos, quizzes and quiz submissions?`)) return;

        try {
            setFileLoading(true);
            const paths = (lessonToDelete.videos || [])
                .map(v => v.driveUrl)
                .filter(p => p && p !== "empty" && !isExternalUrl(p));

            // Remove stored files first; if that fails, keep the lesson so it can be retried
            if (paths.length > 0) {
                try {
                    await removeStoredFiles(paths);
                } catch (err) {
                    console.error(err);
                    alert("Could not delete the lesson's files from storage: " + err.message + "\nThe lesson was not deleted.");
                    return;
                }
            }

            const response = await fetch(`${API}/delete/lesson/${lId}`, {
                method: "DELETE", headers: { "Content-Type": "application/json" }
            });
            const data = await response.json();
            if (data.mStatus !== "ok") {
                alert("Deleting lesson failed: " + (data.mMessage || ""));
                return;
            }

            setLessonArray(prev => prev.filter(l => l.lessonId !== lId));
            setOpenLessons(prev => { const copy = { ...prev }; delete copy[lId]; return copy; });
        } catch (error) {
            console.error(error);
            alert("Deleting lesson failed");
        } finally {
            setFileLoading(false);
        }
    }

    let Id1='-1'
    let Id2='-1'

    let sort1 = '-1'
    let sort2 = '-1'

    async function swapLessons(){
        try{
            const lessons = [Id1, Id2, sort1, sort2]
            console.log('lessons = ',lessons)
            const swapResponse = await fetch(`${API}/swaplessons`,{
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: lessons
            })

            const swapData = await swapResponse.json()
            if(swapData.mStatus !== "ok"){ console.log('swapping units mstatus = ',swapData.mStatus) }
        }catch(error){
            console.log('swapping units failed ',error.message)
        }finally{
            Id1=-1
            Id2=-1

            sort1 = -1
            sort2 = -1
        }
        return
    }

    function handleStartDragLesson(lessonId, sort){
        // event.stopPropagation()
        const drag = document.getElementById(`dragLesson-${lessonId}`)
        drag.style.opacity=0.33
        Id1=lessonId
        sort1 = sort
        // console.log('id1 = ',Id1)
        // console.log('sort1 = ',sort1)
    }
    function handleDragLesson(lessonId){
        console.log("drag for ",lessonId)
    }
    function handleDragOverLesson(event, lessonId, sort){
        event.preventDefault()
        Id2=lessonId
        sort2 = sort
        // console.log('id2 = ',Id2)
        // console.log('sort2 = ',sort2)
    }
    function handleDragEndLesson(lessonId){
        const drag = document.getElementById(`dragLesson-${lessonId}`)
        drag.style.opacity=1
        if(Id1===-1 || Id2===-1 || Id1===Id2){
            Id1 = -1
            Id2 = -1

            sort1=-1
            sort2 = -1
            return
        }
        else{
            let id1Changed = false
            let id2Changed = false

            // console.log('lessonsArray = ',lessonsArray)

            const newLessonOrder = lessonsArray.map((lesson)=>{
                if(lesson.lessonId===Id1 && !id1Changed){
                    id1Changed = !id1Changed
                    return {lessonId: lesson.lessonId, unitId: lesson.unitId, lessonTitle: lesson.lessonTitle,
                        lessonDescription: lesson.lessonDescription, sortOrder: sort2, videos: lesson.videos}
                }
                else if(lesson.lessonId===Id2 && !id2Changed){
                    id2Changed= !id2Changed
                    return {lessonId: lesson.lessonId, unitId: lesson.unitId, lessonTitle: lesson.lessonTitle,
                        lessonDescription: lesson.lessonDescription, sortOrder: sort1, videos: lesson.videos}
                }
                else{
                    return lesson
                }
            })
            // console.log('new lesson order = ',newLessonOrder)
            setLessonArray(newLessonOrder)
            swapLessons()
        }
    }

    /* ADD VIDEO */

    function addMaterials(lessonId) {
        setAddingMaterials(lessonId);
    }

    function cancelMaterials() {
        setAddingMaterials(null);
        setFileUpload(null);
        setFileName("No video selected");
    }

    async function uploadNewMaterials(filename, filedata, lessonId) {
        const title = videoTitles[lessonId]?.trim() || filedata?.name.replace(/\.[^.]+$/, '');

        if (!canManage || fileLoading) return;
        if (!filedata) { alert("Choose a video first."); return; }
        if (!filedata.type.startsWith('video/') && !isVideoFile(filedata.name)) { alert('Please choose a video file.'); return; }
        if (!title) { alert("Enter a title first."); return; }

        setFileLoading(true);
        try {
            const doesFileExist = await fetch(`${API}/unit_videos/${unit.unitId}/lesson/${lessonId}/${encodeURIComponent(title)}`);
            const doesFileExistData = await doesFileExist.json();

            if (doesFileExistData.mData) {
                alert("Video with that title in this unit already exists. Give a new title");
                return;
            }

            // Timestamp keeps keys unique even if two titles/filenames sanitize to the same text
            const key = `course/${courseId}/unit/${unit.unitId}/lesson/${lessonId}/${Date.now()}_${safeSegment(title)}/${safeSegment(filedata.name)}`;

            try {
                await uploadToB2(filedata, key, authToken, pct => setFileName(`Uploading… ${pct}%`));
            } catch (err) {
                console.error(err);
                alert('Upload failed: ' + err.message);
                setFileName(filedata.name);
                return;
            }

            // Only create the DB row after the file is safely stored
            const response = await fetch(`${API}/unit_videos/unit/${unit.unitId}/lesson/${lessonId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, filepath: B2_PREFIX + key })
            });
            const videoData = await response.json();

            if (videoData.mStatus !== "ok" || !(videoData.mData > 0)) {
                await deleteFromB2([key], authToken).catch(() => {}); // don't leave an orphaned file
                alert("Adding video failed: " + (videoData.mMessage || ""));
                return;
            }

            // Show the new video immediately, no page refresh needed
            const newVideo = {
                videoId: videoData.mData,
                unitId: unit.unitId,
                lessonId,
                title,
                driveUrl: B2_PREFIX + key,
                duration: null,
                sortOrder: 0
            };

            setLessonArray(prev =>
                prev.map(lesson =>
                    lesson.lessonId === lessonId
                        ? { ...lesson, videos: [...(lesson.videos || []), newVideo] }
                        : lesson
                )
            );

            setOpenLessons(prev => ({ ...prev, [lessonId]: true }));
            setActiveVideo(newVideo.videoId);
            setVideoTitles(prev => ({ ...prev, [lessonId]: "" }));
            cancelMaterials();
        } catch (error) {
            console.error(error);
            alert("Upload failed. Please try again.");
        } finally {
            setFileLoading(false);
        }
    }

    /* DELETE VIDEO */

    async function deleteFile(driveurl, lessonId, videoId) {
        if (!window.confirm("Delete this video?")) return;

        try {
            setFileLoading(true);

            // Remove the stored file first; if this fails, keep the row so you can retry
            if (driveurl && driveurl !== "empty" && !isExternalUrl(driveurl)) {
                try {
                    await removeStoredFiles([driveurl]);
                } catch (err) {
                    console.error(err);
                    alert("Could not delete the file from storage: " + err.message + "\nThe video was not removed. Please try again.");
                    return;
                }
            }

            const videoEntry = await fetch(
                `${API}/delete/unit_videos/unit/${unit.unitId}/lesson/${lessonId}/videoId/${videoId}`,
                { method: "DELETE", headers: { "Content-Type": "application/json" } }
            );
            const videoEntryData = await videoEntry.json();
            if (videoEntryData.mStatus !== "ok") {
                alert("Deleting video failed");
                return;
            }

            setLessonArray(prev => prev.map(lesson =>
                lesson.lessonId === lessonId
                    ? { ...lesson, videos: lesson.videos.filter(v => v.videoId !== videoId) }
                    : lesson
            ));
            setFileUrl(prev => { const copy = { ...prev }; delete copy[videoId]; return copy; });
            if (activeVideo === videoId) setActiveVideo(null);
        } catch (error) {
            console.error(error);
            alert("Deleting video failed");
        } finally {
            setFileLoading(false);
        }
    }

    /* VIDEO REORDER */

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
            const lesson = lessonsArray.find((l) => l.lessonId === lessonId);
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
        const lesson = lessonsArray.find((l) => l.lessonId === lId);
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
            const swapTitles = {
                videoTitle1: video1.title,
                videoTitle2: video2.title
            };

            const response = await fetch(
                `${API}/course_units/unit/${unit.unitId}/lesson/${lId}/swap/${video1.videoId}/${video2.videoId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(swapTitles)
                }
            );

            const responseData = await response.json();

            if (responseData.mStatus !== "ok") {
                alert("Swapping failed: " + responseData.mMessage);
                return;
            }

            // Swap locally as well so the UI immediately updates
            setLessonArray((prev) =>
                prev.map((lessonItem) => {
                    if (lessonItem.lessonId !== lId) return lessonItem;

                    const videos = [...lessonItem.videos];
                    const index1 = videos.findIndex((v) => v.videoId === video1.videoId);
                    const index2 = videos.findIndex((v) => v.videoId === video2.videoId);

                    if (index1 !== -1 && index2 !== -1) {
                        [videos[index1], videos[index2]] = [videos[index2], videos[index1]];
                    }

                    return { ...lessonItem, videos };
                })
            );

            cancelReorder();
        } catch (error) {
            console.error(error);
            alert("Could not reorder videos");
        }
    }

    /* NEXT VIDEO */

    function goToNextVideo(lessonId, currentVideoId) {
        const currentLesson = lessonsArray.find((lesson) => lesson.lessonId === lessonId);
        if (!currentLesson) return;

        const videos = currentLesson.videos || [];
        const idx = videos.findIndex((v) => v.videoId === currentVideoId);

        if (idx === -1 || idx === videos.length - 1) return;

        setActiveVideo(videos[idx + 1].videoId);
    }

    /* GA4 */

    function ga4AddView(vId, vidTitle, unitTitle, courseTitle) {
        ReactGA.event({
            category: "course videos",
            action: "viewed " + vidTitle + " course " + courseTitle + " unit " + unitTitle,
            label: vId
        });
    }

    let vidLessonId1 = '-1'
    let vidLessonId2 = '-1'

    let vidId1='-1'
    let vidId2='-1'

    let vidSort1 = '-1'
    let vidSort2 = '-1'

    async function swapVideos(){
        try{
            const videos = [vidId1, vidId2, vidSort1, vidSort2]
            // console.log('videos = ',videos)
            const swapResponse = await fetch(`${API}/swapvideos`,{
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: videos
            })

            const swapData = await swapResponse.json()
            if(swapData.mStatus !== "ok"){ console.log('swapping videos mstatus = ',swapData.mStatus) }
        }catch(error){
            console.log('swapping vidoes failed ',error.message)
        }finally{
            vidLessonId1 = -1
            vidLessonId2=-1

            vidId1=-1
            vidId2=-1

            vidSort1 = -1
            vidSort2 = -1
        }
        return
    }
    // function stopLessonDrag(event,){

    // }
    function handleStartDragVideo(event, lessonId, videoId, sort){
        event.stopPropagation()
        const drag = document.getElementById(`dragVideo-${videoId}`)
        drag.style.opacity=0.33
        vidLessonId1 = lessonId
        vidId1=videoId
        vidSort1 = sort
        console.log('vidId1 = ',vidId1)
        console.log('vidSort1 = ',vidSort1)
    }
    function handleDragVideo(event,videoId){
        event.stopPropagation()
        console.log("drag for ",videoId)
    }
    function handleDragOverVideo(event, lessonId, videoId, sort){
        event.stopPropagation()
        event.preventDefault()
        vidLessonId2=lessonId
        vidId2=videoId
        vidSort2 = sort
        console.log('vidId2 = ',vidId2)
        console.log('vidSort2 = ',vidSort2)
    }
    function handleDragEndVideo(event,videoId){
        event.stopPropagation()
        const drag = document.getElementById(`dragVideo-${videoId}`)
        drag.style.opacity=1
        if(vidId1===-1 || vidId2===-1 || vidId1===vidId2
            || vidLessonId1==='-1' || vidLessonId2==='-1' || vidLessonId1!==vidLessonId2
        ){
            vidLessonId1=-1
            vidLessonId2=-1

            vidId1 = -1
            vidId2 = -1

            vidSort1=-1
            vidSort2 = -1
            return
        }
        else{
            console.log('lessonsArray = ',lessonsArray)
            const newVideoOrder = lessonsArray.map((lesson)=>{
                if(lesson.lessonId===vidLessonId1 && lesson.lessonId === vidLessonId2){
                    const editedVideos=lesson.videos.map((video)=>{
                        if(video.videoId===vidId1){
                            return{
                                 ...video, sortOrder:vidSort2
                            }
                        }
                        else if(video.videoId===vidId2){
                            return{
                                 ...video, sortOrder:vidSort1
                            }
                        }
                        return video
                    })
                    return{ ...lesson, videos:editedVideos }
                }
                return lesson
            })
            console.log('newVideoOrder = ',newVideoOrder)
            setLessonArray(newVideoOrder)
            swapVideos()
        }
    }

    /* RENDER */

    return (
        <div className={embedded ? "lesson-library" : "materials-unit"} style={{opacity:fileLoading? 0.5 : 1}}>

            <div className = 'loader' style={{display:fileLoading?'flex':'none'}}></div>

            {/* UNIT HEADER */}

            <div
                hidden={embedded}
                className={`materials-unit-header ${open ? "is-open" : ""}`}
                onClick={() => setOpen((prev) => !prev)}
            >
                <div className="materials-unit-header-left">
                    <div className={`materials-icon-badge ${open ? "is-active" : ""}`}>📁</div>
                    <div className="materials-unit-title-group">
                        <div className="materials-unit-title">{unit.title}</div>
                        <div className="materials-unit-subtitle">
                            {lessonsArray.length} lesson{lessonsArray.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                </div>
                <span className={`materials-chevron ${open ? "is-open" : ""}`}>›</span>
            </div>

            {/* UNIT CONTENT */}

            {(embedded || open) && (
                <div className="materials-unit-body lesson-library-body">

                    {lessonsArray.length > 0 && <div className="unit-library-top lesson-library-top">
                        <label className="unit-search"><span className="unit-search-symbol" aria-hidden="true" /><input aria-label="Search lessons" placeholder="Search lessons..." value={lessonSearch} onChange={event => setLessonSearch(event.target.value)} /></label>
                    </div>}
                    {lessonsArray.length === 0 ? (
                        <>{!canManage && <div className="materials-empty">No lessons in this unit yet.</div>}</>
                    ) : (
                        <div className="materials-lesson-list">
                            {[...lessonsArray].sort((a,b)=>a.sortOrder-b.sortOrder).filter(lesson => lesson.lessonTitle.toLowerCase().includes(lessonSearch.trim().toLowerCase())).map((lesson, idx) => {

                                const isLessonOpen = !!openLessons[lesson.lessonId];
                                const lessonTab = lessonTabs[lesson.lessonId] || 'video';
                                const sortedVideos = [...(lesson.videos || [])].sort((a, b) => a.sortOrder - b.sortOrder);
                                const quizProps = { unitId, lessonId: lesson.lessonId, videos: sortedVideos, revision: quizRevision, onChanged: () => setQuizRevision(r => r + 1) };
                                return (
                                    <div id = {`dragLesson-${lesson.lessonId}`} className={`materials-lesson${lessonMenu === lesson.lessonId ? " lesson-menu-open" : ""}`} draggable={canManage && !editingLesson && !lessonSearch.trim()} onDragStart={()=>handleStartDragLesson(lesson.lessonId, lesson.sortOrder)} onDrag={()=>handleDragLesson(lesson.lessonId)} onDragOver={(e)=>handleDragOverLesson(e,lesson.lessonId, lesson.sortOrder)} onDragEnd={()=>handleDragEndLesson(lesson.lessonId)} key={lesson.lessonId}>

                                        {/* LESSON HEADER */}

                                        <div className="materials-lesson-top" onClick={() => toggleLesson(lesson.lessonId)}>
                                            <div style={{ minWidth: 0 }}>
                                                <div className="materials-lesson-heading">
                                                    {lesson.lessonTitle}
                                                </div>

                                            </div>

                                                <div
                                                className="lesson-header-actions"
                                                onClick={event => event.stopPropagation()}
                                                >
                                                {canManage && (
                                                    <>
                                                    {editingLesson === lesson.lessonId && (
                                                        <span className="lesson-editing-label">Editing</span>
                                                    )}

                                                    <button
                                                        className="materials-icon-btn"
                                                        disabled={fileLoading}
                                                        onClick={() =>
                                                        editingLesson === lesson.lessonId
                                                            ? closeEditLesson()
                                                            : editLessonButton(lesson)
                                                        }
                                                    >
                                                        {editingLesson === lesson.lessonId ? 'Done' : 'Edit'}
                                                    </button>

                                                    <button
                                                        className="materials-icon-btn danger"
                                                        onClick={() => deleteLessonButton(lesson.lessonId)}
                                                    >
                                                        Delete Lesson
                                                    </button>
                                                    </>
                                                )}

                                                <button
                                                    className="materials-icon-btn"
                                                    aria-label={`Open ${lesson.lessonTitle}`}
                                                    aria-expanded={isLessonOpen}
                                                    onClick={() => toggleLesson(lesson.lessonId)}
                                                >
                                                    <span
                                                    className={`lesson-chevron${isLessonOpen ? ' is-open' : ''}`}
                                                    aria-hidden="true"
                                                    />
                                                </button>
                                                </div>
                                        </div>

                                        {/* EDIT LESSON */}

                                        {canManage && editingLesson === lesson.lessonId && (
                                            <div className="materials-add-lesson-form">
                                                <label>Lesson Title</label>
                                                <input
                                                    type="text"
                                                    value={editLessonTitle}
                                                    onChange={(e) => setEditLessonTitle(e.target.value)}
                                                    className="materials-inline-input"
                                                />
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button className="materials-icon-btn" onClick={() => sendEditLesson(lesson.lessonId)}>Save</button>
                                                    <button className="materials-icon-btn" onClick={() => closeEditLesson()}>Cancel</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* LESSON TOOLBAR */}

                                        {canManage && editingLesson === lesson.lessonId && (
                                            <div className="materials-lesson-toolbar">
                                                <div hidden><button onClick={() => startReorder(lesson.lessonId)}>Reorder Videos</button><button onClick={() => swapVideoId(lesson.lessonId)}>Swap Selected</button></div>
                                                <input id={`lesson-upload-${lesson.lessonId}`} type="file" accept="video/*,.mkv,.avi,.mov,.m4v" aria-label="Choose lesson video" hidden disabled={fileLoading} onChange={event => uploadFileHandler(event, lesson.lessonId)} />
                                                <button
                                                    className="materials-icon-btn"
                                                    disabled={fileLoading}
                                                    onClick={() => { addMaterials(lesson.lessonId); document.getElementById(`lesson-upload-${lesson.lessonId}`).click(); }}
                                                >
                                                    Upload Video
                                                </button>
                                                <button className="materials-icon-btn" onClick={() => setOpenLessons(current => ({ ...current, [lesson.lessonId]: true }))}>Add / Manage Quiz</button>

                                            </div>
                                        )}

                                        {/* ADD VIDEO */}

                                        {canManage && editingLesson === lesson.lessonId && addingMaterials === lesson.lessonId && (
                                            <div className="materials-add-lesson-form">
                                                <label>Select File</label>

                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <input
                                                        type="file"
                                                        id={`hiddenAddFileInput-${lesson.lessonId}`}
                                                        onChange={event => uploadFileHandler(event, lesson.lessonId)}
                                                        accept="video/*,.mkv,.avi,.mov,.m4v"
                                                        style={{ display: "none" }}
                                                    />
                                                    <button
                                                        className="materials-icon-btn"
                                                        onClick={() => document.getElementById(`hiddenAddFileInput-${lesson.lessonId}`).click()}
                                                    >
                                                        Choose File
                                                    </button>
                                                    <span style={{ fontSize: 13, color: "#6d6877", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {fileName}
                                                    </span>
                                                </div>

                                                <label>Video title</label>

                                                <input
                                                    type="text"
                                                    value={videoTitles[lesson.lessonId] || ""}
                                                    onChange={(e) =>
                                                        setVideoTitles((prev) => ({
                                                            ...prev,
                                                            [lesson.lessonId]: e.target.value
                                                        }))
                                                    }
                                                    className="materials-inline-input"
                                                    placeholder="Enter title"
                                                />

                                                {fileUpload && (
                                                    <div style={{ fontSize: 12, color: "#6d6877" }}>
                                                        Selected: {fileUpload.name}
                                                    </div>
                                                )}

                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button
                                                        className="materials-icon-btn"
                                                        disabled={fileLoading}
                                                        onClick={() => uploadNewMaterials(fileName, fileUpload, lesson.lessonId)}
                                                    >
                                                        Upload
                                                    </button>
                                                    <button className="materials-icon-btn" onClick={cancelMaterials}>Cancel</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* REORDER LIST */}

                                        {reorderingLesson === lesson.lessonId && (
                                            <div style={{ padding: "8px 16px 12px" }}>
                                                <div style={{ fontSize: 12, color: "#97919c", marginBottom: 8 }}>
                                                    Select exactly two videos to swap.
                                                </div>

                                                {(lesson.videos || []).map((video) => (
                                                    <div
                                                        key={video.videoId}
                                                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}
                                                    >
                                                        <button
                                                            className="materials-icon-btn"
                                                            onClick={() => toggleVideoSelection(video.videoId)}
                                                        >
                                                            {selectedVideos[video.videoId] ? "✓" : "○"}
                                                        </button>
                                                        <span>{video.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* LESSON CLICK HEADER */}

                                        <div
                                            hidden
                                            className={`materials-video-row ${isLessonOpen ? "is-active" : ""}`}
                                            onClick={() => toggleLesson(lesson.lessonId)}
                                            style={{ margin: "0 16px 8px" }}
                                        >
                                            <div className="materials-video-play">{isLessonOpen ? "−" : "+"}</div>

                                            <div style={{ flex: 1 }}>
                                                <div className="materials-video-title">Lesson materials</div>
                                                <div className="materials-video-meta">
                                                    {lesson.videos?.length || 0} video{(lesson.videos?.length || 0) !== 1 ? "s" : ""}
                                                </div>
                                            </div>

                                            <span className={`materials-chevron ${isLessonOpen ? "is-open" : ""}`}>›</span>
                                        </div>

                                        {/* VIDEOS */}

                                        {isLessonOpen && <div className="quiz-tabs lesson-content-tabs" aria-label={`${lesson.lessonTitle} content`}>
                                            <button aria-pressed={lessonTab === 'video'} onClick={() => setLessonTabs(current => ({ ...current, [lesson.lessonId]: 'video' }))}>Video</button>
                                
                                            <button aria-pressed={lessonTab === 'live'} onClick={() => setLessonTabs(current => ({ ...current, [lesson.lessonId]: 'live' }))}>Live Links</button>
                                        </div>}
                                        {isLessonOpen && <div hidden={lessonTab !== 'live'}><LessonLiveLinks unitId={unitId} lessonId={lesson.lessonId} inheritedUrl={lessonLiveUrl} editing={canManage && editingLesson === lesson.lessonId} onDraftChange={editingLesson === lesson.lessonId ? setLiveDraftOpen : undefined} /></div>}
                                        {isLessonOpen && (
                                                <div hidden={lessonTab !== 'quiz'}>
                                                    <UnitQuizzes
                                                        {...quizProps}
                                                        allowCreate={canManage && editingLesson === lesson.lessonId}
                                                        onDraftChange={setQuizDraftOpen}
                                                    />
                                                </div>
                                            )}
                                        {isLessonOpen && lessonTab === 'video' && (
                                            <div className="materials-lesson-body">
                                        {canManage && editingLesson === lesson.lessonId && (
                                            <div className="materials-lesson-toolbar">
                                                <div hidden><button onClick={() => startReorder(lesson.lessonId)}>Reorder Videos</button><button onClick={() => swapVideoId(lesson.lessonId)}>Swap Selected</button></div>
                                                <input id={`lesson-upload-${lesson.lessonId}`} type="file" aria-label="Choose lesson video" hidden disabled={fileLoading} onChange={event => uploadFileHandler(event, lesson.lessonId)} />
                                                <button
                                                    className="primary material-add-button"
                                                    disabled={fileLoading}
                                                    onClick={() => { addMaterials(lesson.lessonId); document.getElementById(`lesson-upload-${lesson.lessonId}`).click(); }}
                                                >
                                                    <span className="material-add-icon" aria-hidden="true" />Add Video
                                                </button>

                                            </div>
                                        )}

                                        {/* ADD VIDEO */}

                                        {canManage && editingLesson === lesson.lessonId && addingMaterials === lesson.lessonId && (
                                            <div className="materials-add-lesson-form">
                                                <label>Select Video</label>

                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <input
                                                        type="file"
                                                        id={`hiddenAddFileInput-${lesson.lessonId}`}
                                                        onChange={event => uploadFileHandler(event, lesson.lessonId)}

                                                        style={{ display: "none" }}
                                                    />
                                                    <button
                                                        className="materials-icon-btn"
                                                        onClick={() => document.getElementById(`hiddenAddFileInput-${lesson.lessonId}`).click()}
                                                    >
                                                        Choose Video
                                                    </button>
                                                    <span style={{ fontSize: 13, color: "#6d6877", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {fileName}
                                                    </span>
                                                </div>

                                                <label>Video title</label>

                                                <input
                                                    type="text"
                                                    value={videoTitles[lesson.lessonId] || ""}
                                                    onChange={(e) =>
                                                        setVideoTitles((prev) => ({
                                                            ...prev,
                                                            [lesson.lessonId]: e.target.value
                                                        }))
                                                    }
                                                    className="materials-inline-input"
                                                    placeholder="Enter title"
                                                />

                                                {fileUpload && (
                                                    <div style={{ fontSize: 12, color: "#6d6877" }}>
                                                        Selected: {fileUpload.name}
                                                    </div>
                                                )}

                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button
                                                        className="materials-icon-btn"
                                                        disabled={fileLoading}
                                                        onClick={() => uploadNewMaterials(fileName, fileUpload, lesson.lessonId)}
                                                    >
                                                        Upload Video
                                                    </button>
                                                    <button className="materials-icon-btn" onClick={cancelMaterials}>Cancel</button>
                                                </div>
                                            </div>
                                        )}



                                                {(lesson.videos || []).length === 0 ? (
                                                    <div className="materials-empty">No videos in this lesson yet.</div>
                                                ) : (
                                                    <div className="materials-video-list">
                                                        {lesson.videos.sort((c,d)=>c.sortOrder-d.sortOrder).map((video) => {

                                                            const isActive = activeVideo === video.videoId;

                                                            return (
                                                                <div id = {`dragVideo-${video.videoId}`}draggable={canManage && editingLesson === lesson.lessonId && !lessonSearch.trim()} onDragStart={(e)=>handleStartDragVideo(e,video.lessonId, video.videoId, video.sortOrder)} onDrag={(e)=>handleDragVideo(e,video.videoId)} onDragOver={(e)=>handleDragOverVideo(e,video.lessonId, video.videoId, video.sortOrder)} onDragEnd={(e)=>handleDragEndVideo(e,video.videoId)} key={video.videoId}>

                                                                    {/* VIDEO ROW */}

                                                                    <div
                                                                        className={`materials-video-row ${isActive ? "is-active" : ""}`}
                                                                        onClick={() => {
                                                                            setActiveVideo(isActive ? null : video.videoId);
                                                                            ga4AddView(video.videoId, video.title, unit.title, courseTitle);
                                                                        }}
                                                                    >
                                                                        <div className="materials-video-play">▶</div>

                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div className="materials-video-title">{video.title}</div>
                                                                            {video.duration && (
                                                                                <div className="materials-video-meta">{video.duration}</div>
                                                                            )}
                                                                        </div>

                                                                        {canManage && editingLesson === lesson.lessonId && (
                                                                            <button
                                                                                className="materials-icon-btn danger"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    deleteFile(video.driveUrl, lesson.lessonId, video.videoId);
                                                                                }}
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        )}

                                                                        <span className={`materials-chevron ${isActive ? "is-open" : ""}`}>›</span>
                                                                    </div>

                                                                    {/* VIDEO PLAYER */}

                                                                    {isActive && (
                                                                        <div style={{ background: "#f5c8f3", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>

                                                                            {video.driveUrl &&
                                                                            !video.driveUrl.includes("FILE_ID") &&
                                                                            video.driveUrl !== "empty" ? (
                                                                                fileUrl[video.videoId] ? (
                                                                                    isVideoFile(video.driveUrl) ? (
                                                                                        <><video
                                                                                            key={fileUrl[video.videoId]}
                                                                                            src={fileUrl[video.videoId]}
                                                                                            controls
                                                                                            onError={event => { event.currentTarget.nextElementSibling.hidden = false; }}
                                                                                            controlsList="nodownload"
                                                                                            playsInline
                                                                                            preload="metadata"
                                                                                            style={{
                                                                                                width: "100%",
                                                                                                maxHeight: "800px",
                                                                                                display: "block",
                                                                                                backgroundColor: "#000"
                                                                                            }}
                                                                                        /><p hidden role="status" className="video-playback-error">This video could not be played. Its format may not be supported by your browser, or the connection may have failed. Try an MP4 encoded with H.264/AAC.</p></>
                                                                                    ) : (
                                                                                        <iframe
                                                                                            src={fileUrl[video.videoId]}
                                                                                            width="100%"
                                                                                            height="800"
                                                                                            allow="autoplay"
                                                                                            style={{ border: "none", display: "block" }}
                                                                                            title={video.title}
                                                                                        />
                                                                                    )
                                                                                ) : (
                                                                                    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#777" }}>
                                                                                        Loading video...
                                                                                    </div>
                                                                                )
                                                                            ) : (
                                                                                <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666", gap: 10 }}>
                                                                                    <a
                                                                                        href={video.title}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        style={{ fontSize: 18, color: "#6C63FF", fontWeight: 700 }}
                                                                                    >
                                                                                        Take your quiz here
                                                                                    </a>
                                                                                    <span style={{ fontSize: 13 }}>Click the link to take your quiz.</span>
                                                                                </div>
                                                                            )}

                                                                            {/* NEXT VIDEO */}

                                                                            {lesson.videos.findIndex((v) => v.videoId === video.videoId) < lesson.videos.length - 1 && (
                                                                                <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end" }}>
                                                                                    <button
                                                                                        className="materials-icon-btn"
                                                                                        onClick={() => goToNextVideo(lesson.lessonId, video.videoId)}
                                                                                    >
                                                                                        Next Video ›
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                        </div>
                                                                    )}
                                                                    <UnitQuizzes {...quizProps} afterVideoId={video.videoId} allowCreate={false} />
                                                                </div>
                                                            );
                                                        })}

                                                    </div>
                                                )}

                                                <UnitQuizzes {...quizProps} afterVideoId={null} allowCreate={canManage && editingLesson === lesson.lessonId} />

                                            </div>
                                        )}

                                    </div>
                                );
                            })}

                        </div>
                    )}

                    {lessonSearch.trim() && !lessonsArray.some(lesson => lesson.lessonTitle.toLowerCase().includes(lessonSearch.trim().toLowerCase())) && <p className="unit-library-empty">No lessons match your search.</p>}
                    {canManage && showAddLesson && (
                        <div className="materials-add-lesson-form unit-editor">
                            <h3>Create Lessons</h3>
                            <label htmlFor={`lesson-count-${unitId}`}>Number of lessons</label>
                            <select id={`lesson-count-${unitId}`} disabled={creatingLessons} value={lessonCount} onChange={event => setLessonCount(Number(event.target.value))}>{Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
                            {Array.from({ length: lessonCount }, (_, index) => <div key={index}>
                                <label htmlFor={`lesson-title-${unitId}-${index}`}>Lesson {index + 1} name</label>
                                <input id={`lesson-title-${unitId}-${index}`} type="text" disabled={creatingLessons} value={lessonTitles[index] || ''} onChange={event => setLessonTitles(titles => { const next = [...titles]; next[index] = event.target.value; return next; })} className="materials-inline-input" placeholder={`Lesson ${index + 1}`} />
                            </div>)}
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="materials-icon-btn" disabled={creatingLessons} onClick={createNewLesson}>{creatingLessons ? 'Creating...' : 'Create Lessons'}</button>
                                <button className="materials-icon-btn" disabled={creatingLessons} onClick={cancelLesson}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {canManage && !showAddLesson && <button className="unit-add-card" onClick={addLesson}><span className="unit-add-plus" aria-hidden="true" />Add Lesson</button>}

                </div>
            )}
        </div>
    );
}


export function MaterialsTab({ course, userData }) {
    const activeEditor = useRef(null);
    function requestLessonEditor(key, close) {
        if (activeEditor.current && activeEditor.current.key.split(':')[0] !== key.split(':')[0] && !activeEditor.current.close()) return false;
        activeEditor.current = { key, close };
        return true;
    }

    const[unitArr, setUnitArr]=useState([])
   
    const canManageUnits = userData?.role === "admin" || (!!userData?.username && userData.username === course.instructor);
    const [unitSearch, setUnitSearch] = useState('');
    const [addingUnit, setAddingUnit] = useState(false);
    const [savingUnit, setSavingUnit] = useState(false);
    const [unitError, setUnitError] = useState('');

    useEffect(()=>{
        const array = (course?.units || []).map((unit)=>{
            return {unitId: unit.unitId, courseId: course.courseId, title: unit.title, sortOrder: unit.sortOrder, lessons: unit?.lessons}
        })
        setUnitArr(array)
    },[course])

    async function submitNewUnit(title) {
        if (!canManageUnits || savingUnit) return;
        setSavingUnit(true);
        setUnitError('');
        try {
            const sortOrder = Math.max(-1, ...unitArr.map(unit => Number(unit.sortOrder) || 0)) + 1;
            const response = await fetch(`${API}/course_units/${course.courseId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitName: title, sortOrder }) });
            const data = await response.json();
            if (data.mStatus !== "ok") throw new Error(data.mMessage || 'Could not create unit.');
            setUnitArr(units => [...units, { unitId: data.mData, courseId: course.courseId, title, sortOrder, lessons: [] }]);
            setAddingUnit(false);
            setUnitSearch('');
        } catch (error) { setUnitError(error.message); }
        finally { setSavingUnit(false); }
    }
    async function sendDeleteUnits(unitId){
        const unit = unitArr.find(item => item.unitId === unitId);
        if (!unit || !window.confirm(`Delete "${unit.title}" and its contents? This cannot be undone.`)) return;
        try{
            const paths = (unit.lessons || [])
                .flatMap(lesson => (lesson.videos || []).map(v => v.driveUrl))
                .filter(p => p && p !== 'empty' && !isExternalUrl(p))

            // Remove stored files (B2 and old Supabase) first; if that fails, keep the unit
            if (paths.length > 0) {
                try {
                    await removeStoredFiles(paths)
                } catch (err) {
                    console.error(err)
                    alert('Could not delete the unit files from storage: ' + err.message + '\nThe unit was not deleted.')
                    return
                }
            }

            const deleteUnitResponse = await fetch(`${API}/delete/units/course/${course.courseId}`,{
                method:"POST",
                headers: { "Content-Type": "application/json" },
                body: String(unitId)
            })
            const deleteUnitData = await deleteUnitResponse.json()
            if (deleteUnitData.mStatus !== "ok") { alert("deleting unit failed: " + deleteUnitData.mMessage); return; }
            setUnitArr(prev => prev.filter(u => u.unitId !== unitId))
        }catch(error){
            console.log(error.message)
        }
    }

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
        }catch(error){
            console.log('swapping units failed ',error.message)
        }finally{
            uId1=-1
            uId2=-1

            sortNum1 = -1
            sortNum2 = -1
        }
    }

    function handleStartDrag(uId, sort){
        const drag = document.getElementById(`dragUnit-${uId}`)
        drag.style.opacity=0.33
        uId1=uId
        sortNum1 = sort
    }
    function handleDrag(uId){
        console.log("drag for ",uId)
    }
    function handleDragOver(event, uId, sort){
        event.preventDefault()
        uId2=uId
        sortNum2 = sort
    }
    function handleDragEnd(uId){
        const drag = document.getElementById(`dragUnit-${uId}`)
        drag.style.opacity=1
        if(uId1===-1 || uId2===-1 || uId1===uId2){
            uId1 = -1
            uId2 = -1

            sortNum1=-1
            sortNum2 = -1
            return
        }
        else{
            let id1Changed = false
            let id2Changed = false

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
            setUnitArr(newUnitOrder)
            swapUnits()
        }
    }

    const location = useLocation();
    const visibleUnits = [...unitArr].sort((a, b) => a.sortOrder - b.sortOrder).filter(unit => unit.title.toLocaleLowerCase().includes(unitSearch.trim().toLocaleLowerCase()));
    return <div className="unit-library">
            <div className="unit-library-top">
                <label className="unit-search">
                    <span className="unit-search-symbol" aria-hidden="true" />
                    <input
                        aria-label="Search units"
                        placeholder="Search units..."
                        value={unitSearch}
                        onChange={event => setUnitSearch(event.target.value)}
                    />
                </label>
            </div>
        <div className="unit-library-list">
            {visibleUnits.map(unit =>
                <div id={`dragUnit-${unit.unitId}`} key={unit.unitId} draggable={canManageUnits && !unitSearch.trim()} onDragStart={()=>handleStartDrag(unit.unitId, unit.sortOrder)} onDrag={()=>handleDrag(unit.unitId)} onDragOver={(e)=>handleDragOver(e,unit.unitId, unit.sortOrder)} onDragEnd={()=>handleDragEnd(unit.unitId)}>
                    <UnitMaterials key={unit.unitId} unit={unit} canManage={canManageUnits} onDelete={() => sendDeleteUnits(unit.unitId)} onTitleChange={title => setUnitArr(units => units.map(item => item.unitId === unit.unitId ? { ...item, title } : item))} initialOpen={location.state?.unitId === unit.unitId}>
                        <UnitSection requestLessonEditor={requestLessonEditor} liveUrl={course.liveUrl} initialLessonId={location.state?.unitId === unit.unitId ? location.state?.lessonId : null} initialLessonTab={location.state?.unitTab === 'quizzes' ? 'quiz' : 'video'} embedded onLessonsChange={lessons => setUnitArr(units => units.map(item => item.unitId === unit.unitId ? { ...item, lessons } : item))} unit={unit} courseId = {course.courseId} role ={userData?.role} username={userData?.username} instructor={course.instructor} unitId={unit.unitId} courseTitle={course.title}/>
                    </UnitMaterials>
                </div>
            )}
            {visibleUnits.length === 0 && <p className="unit-library-empty">{unitSearch.trim() ? 'No units match your search.' : 'No units yet.'}</p>}
        </div>
        {canManageUnits && (addingUnit ?
            <UnitForm heading="Create Unit" saving={savingUnit} error={unitError} onSave={submitNewUnit} onCancel={() => setAddingUnit(false)} /> :
            <button className="unit-add-card" onClick={() => { setUnitError(''); setAddingUnit(true); }}><span className="unit-add-plus" aria-hidden="true" />Add Unit</button>)}
    </div>;
}

function CourseDetail() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [currentUserId, setCurrentUserId] = useState(null);
    const [userAttributes,setUserAttributes]=useState(null)
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requestedTab, setActiveTab] = useState(['video', 'materials'].includes(location.state?.activeTab) ? location.state.activeTab : 'course');
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const canAccessContent = isEnrolled || userAttributes?.role === 'admin' || (userAttributes?.role === 'instructor' && !!userAttributes.username && userAttributes.username === course?.instructor);
    const activeTab = canAccessContent ? requestedTab : 'course';

    const initGrabbed = useRef(false)
    useEffect(() => {
        if(initGrabbed.current===false){
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

                const userRes= await fetch(`${API}/userdata/${user.id}`)
                const userData = await userRes.json()
                setUserAttributes(userData.mData)

                setLoading(false);
            }
            init();
        }
        return ()=>{
            initGrabbed.current=true
        }
    }, [courseId, navigate]);

    async function handleEnroll() {
        if (!currentUserId || course?.price !== 'Free') return;
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
        <div className={`course-detail-page ${activeTab === 'course' ? 'is-course-info' : activeTab === 'video' ? 'is-course-info is-live-preview' : 'is-course-info is-materials-info'}`} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Header />

                <div className="course-detail-layout" style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', gap: '24px' }}>

                    {/* Main content */}
                    <div className="course-detail-main" style={{ flex: 1, minWidth: 0 }}>

                        {/* Back + Tabs */}
                        <div className="course-detail-navigation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                            <button className="course-detail-back" onClick={() => navigate('/courses')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#555', padding: '8px 16px' }}>
                                {activeTab === 'video' ? <><img src="/assets/live/back.svg" alt="" />Back</> : '\u2190 Back'}
                            </button>
                            <div className="course-detail-tabs" style={{ display: 'flex', gap: '8px' }}>
                                <TabButton label="Video" active={activeTab === 'video'} onClick={() => { if (canAccessContent) setActiveTab('video'); }} />
                                <TabButton label="Course" active={activeTab === 'course'} onClick={() => setActiveTab('course')} />
                                <TabButton label="Materials" active={activeTab === 'materials'} onClick={() => { if (canAccessContent) setActiveTab('materials'); }} />
                            </div>
                        </div>

                        {/* Tab content */}
                        <div className="course-detail-panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', minHeight: '400px' }}>
                            {activeTab === 'video' && <VideoTab course={course} />}
                            {activeTab === 'course' && <CourseTab course={course} userData={userAttributes} navigate={navigate} />}
                            {activeTab === 'materials' && <MaterialsTab course={course} userData={userAttributes} />}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="course-detail-sidebar" style={{ width: '240px', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {activeTab === 'video' ? <RoomChatPreview course={course} /> : activeTab === 'materials' && ['user', 'student'].includes(userAttributes?.role) ? <NextClass /> : <>
                        {/* Thumbnail */}
                        <CourseEnrollment course={course} enrolled={isEnrolled} enrolling={enrolling} onEnroll={handleEnroll} isOwner={userAttributes?.role === 'instructor' && userAttributes?.username === course.instructor} />
                                {/* Course highlights */}
                        {/* Live status */}
                        </>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseDetail;


    // const userAttsGrabbed = useRef(false)
    // useEffect(()=>{
    //     if(userAttsGrabbed.current===false){
    //         async function getUserAtts(){
    //             try{
    //                 const res= await fetch(`${API}/userdata/${currentUserId}`)
    //                 const data = await res.json()
    //                 setUserAttributes(data.mData)
    //             }catch(error){
    //                 console.log(error.message)
    //             }
    //             return
    //         }
    //         getUserAtts()
    //     }
    //     return ()=>{
    //         userAttsGrabbed.current=true
    //     }
    // },[currentUserId])

import {useLocation} from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LiveEvents from './LiveEvents';
export default function LiveClasses(){const location=useLocation();return <div className="live-classes-layout"><Sidebar/><main><Header/><div className="live-classes-content"><LiveEvents key={location.key} initialLevel={location.state?.level || ''} fromCourse={location.state?.fromCourse}/></div></main></div>;}

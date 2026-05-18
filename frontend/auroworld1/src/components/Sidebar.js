import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Sidebar() {
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const sidebarWidth = isCollapsed ? '80px' : '240px';

    return (
        <div style={{ 
            width: sidebarWidth, 
            height: '100vh', 
            borderRight: '1px solid #e0e0e0', 
            backgroundColor: '#ffffff',
            padding: '20px 10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between', 
            boxSizing: 'border-box',
            transition: 'width 0.3s ease', 
            overflowX: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
            
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', marginBottom: '40px', padding: '0 10px' }}>
                    
                    {!isCollapsed && (
                        <h2
                            onClick={() => navigate('/posts')}
                            style={{ 
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                fontSize: '20px', 
                                fontWeight: '800',      
                                letterSpacing: '-0.5px', 
                                color: '#111111',       
                                margin: 0, 
                                whiteSpace: 'nowrap', 
                                display: 'flex', 
                                alignItems: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ 
                                display: 'inline-block', 
                                width: '14px',           
                                height: '14px',          
                                backgroundColor: '#ccc', 
                                borderRadius: '50%',     
                                marginRight: '10px',
                                flexShrink: 0           
                            }}></span> 
                            AUROWORLD
                        </h2>
                    )}
                    
                    <div 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{ cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <NavItem isCollapsed={isCollapsed} icon="🏠" label="Homepage" onClick={() => navigate('/posts')} />
                    <NavItem isCollapsed={isCollapsed} icon="📚" label="Courses" onClick={() => navigate('/courses')} />
                    <NavItem isCollapsed={isCollapsed} icon="📅" label="Calendar" onClick={() => navigate('/calendar')} />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NavItem isCollapsed={isCollapsed} icon="⚙️" label="Settings" onClick={() => navigate('/profile')} />
                <NavItem isCollapsed={isCollapsed} icon="🚪" label="Sign Out" color="#d9534f" onClick={() => navigate('/login')} />
            </div>

        </div>
    );
}

function NavItem({ isCollapsed, icon, label, onClick, color = '#333' }) {
    return (
        <div 
            onClick={onClick} 
            className="calendar-day-hover" 
            title={isCollapsed ? label : ""} 
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: '12px 10px', 
                cursor: 'pointer', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: '600', 
                color: color,
                whiteSpace: 'nowrap'
            }}
        >
            <span style={{ fontSize: '20px', marginRight: isCollapsed ? '0' : '12px' }}>{icon}</span>
            {!isCollapsed && <span>{label}</span>}
        </div>
    );
}

export default Sidebar;
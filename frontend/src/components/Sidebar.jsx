import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Settings, LogOut, Activity } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);

  return (
    <div className="sidebar">
      <div className="logo" style={{ gap: '1rem' }}>
        <img src="/logo.png" alt="Company Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
        <Activity color="var(--primary)" size={28} style={{ display: 'none' }} />
        <span>TallyAssist</span>
      </div>
      
      <div style={{ flex: 1, marginTop: '2rem' }}>
        <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/upload" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Upload size={20} /> Upload Invoice
        </NavLink>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={logout}>
          <LogOut size={20} /> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

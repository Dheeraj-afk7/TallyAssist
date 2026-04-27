import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { TrendingUp, AlertCircle, FileText, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ 
      padding: '1rem', 
      borderRadius: '12px', 
      background: `var(--${colorClass})`, 
      color: 'white',
      display: 'flex'
    }}>
      <Icon size={24} />
    </div>
    <div>
      <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{value}</h3>
      <p style={{ margin: 0, fontSize: '0.875rem' }}>{title}</p>
    </div>
  </div>
);

const FolderCard = ({ name, count, amount, onClick }) => (
  <div 
    className="glass-panel" 
    style={{ 
      cursor: 'pointer', 
      transition: 'transform 0.2s', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem' 
    }}
    onClick={onClick}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
      <Folder size={24} fill="currentColor" opacity={0.2} />
      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{name}</h3>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
      <span>{count} Invoices</span>
      <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{amount.toLocaleString()}</span>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><div className="spinner"><TrendingUp /></div></div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Company Overview</h1>
      
      <div className="dashboard-grid">
        <StatCard title="Total Invoices" value={stats?.total_invoices || 0} icon={FileText} colorClass="primary" />
        <StatCard title="Total Amount (₹)" value={(stats?.total_amount || 0).toLocaleString()} icon={TrendingUp} colorClass="success" />
        <StatCard title="Needs Review" value={stats?.errors_detected || 0} icon={AlertCircle} colorClass="warning" />
      </div>

      <h2 style={{ fontSize: '1.25rem', marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Folder size={20} color="var(--primary)" /> My Folders
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {stats?.categories?.length > 0 ? (
          stats.categories.map((cat, idx) => (
            <FolderCard 
              key={idx} 
              name={cat.name} 
              count={cat.count} 
              amount={cat.amount} 
              onClick={() => navigate(`/folder/${encodeURIComponent(cat.name)}`)}
            />
          ))
        ) : (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No folders found. Upload an invoice and assign a category to create a folder.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Folder, Trash2, ArrowLeft, TrendingUp, AlertCircle, FileText } from 'lucide-react';

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

const FolderView = () => {
  const { categoryName } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      const response = await api.get(`/invoices?category=${encodeURIComponent(categoryName)}`);
      setInvoices(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [categoryName]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await api.delete(`/invoices/${id}`);
        fetchInvoices();
      } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete invoice");
      }
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><div className="spinner"><TrendingUp /></div></div>;

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const needsReview = invoices.filter(i => i.status === 'Needs Review').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Folder color="var(--primary)" /> Folder: {categoryName}
        </h1>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <StatCard title="Invoices in Folder" value={invoices.length} icon={FileText} colorClass="primary" />
        <StatCard title="Total Amount (₹)" value={totalAmount.toLocaleString()} icon={TrendingUp} colorClass="success" />
        <StatCard title="Needs Review" value={needsReview} icon={AlertCircle} colorClass="warning" />
      </div>

      <div className="glass-panel">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Invoices in {categoryName}</h2>
        
        {invoices.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} onClick={() => navigate(`/invoice/${inv.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{inv.vendor_name}</td>
                    <td>{inv.invoice_number}</td>
                    <td>{inv.date}</td>
                    <td>₹{inv.total_amount?.toLocaleString() || 0}</td>
                    <td>
                      <span className={`badge ${inv.status === 'Valid' ? 'badge-success' : 'badge-warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', color: 'var(--danger)' }}
                        onClick={(e) => handleDelete(inv.id, e)}
                        title="Delete Invoice"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            No invoices found in this folder.
          </p>
        )}
      </div>
    </div>
  );
};

export default FolderView;

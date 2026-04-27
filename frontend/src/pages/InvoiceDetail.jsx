import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, Save, Trash2, FolderSync, Plus } from 'lucide-react';

const InvoiceDetail = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchInvoiceAndCategories = async () => {
    try {
      const [invRes, catRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get('/categories')
      ]);
      setInvoice(invRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      alert("Invoice not found");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceAndCategories();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/invoices/${id}`, invoice);
      alert('Invoice updated and moved successfully!');
      fetchInvoiceAndCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this invoice?")) {
      try {
        await api.delete(`/invoices/${id}`);
        navigate(invoice.category ? `/folder/${invoice.category}` : '/');
      } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete invoice");
      }
    }
  };

  const updateField = (field, value) => {
    setInvoice({ ...invoice, [field]: value });
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...invoice.line_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = parseFloat(updatedItems[index].quantity) || 0;
      const p = parseFloat(updatedItems[index].unit_price) || 0;
      updatedItems[index].total = parseFloat((q * p).toFixed(2));
    }
    setInvoice({ ...invoice, line_items: updatedItems });
  };

  const removeLineItem = (index) => {
    const updatedItems = invoice.line_items.filter((_, i) => i !== index);
    setInvoice({ ...invoice, line_items: updatedItems });
  };

  const addLineItem = () => {
    const updatedItems = [...invoice.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }];
    setInvoice({ ...invoice, line_items: updatedItems });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><div className="spinner"></div></div>;
  if (!invoice) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ margin: 0 }}>Invoice Details</h1>
        </div>
        <button className="btn btn-secondary" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
          <Trash2 size={18} /> Delete Invoice
        </button>
      </div>

      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>{invoice.vendor_name || 'Unknown Vendor'}</h2>
            <span className={`badge ${invoice.status === 'Valid' ? 'badge-success' : 'badge-warning'}`}>
              {invoice.status}
            </span>
          </div>
          <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <FolderSync size={18} color="var(--primary)" />
            {!isNewCategory ? (
              <select 
                className="input-field" 
                value={invoice.category || ''} 
                onChange={(e) => {
                  if (e.target.value === "ADD_NEW") {
                    setIsNewCategory(true);
                    updateField('category', '');
                  } else {
                    updateField('category', e.target.value);
                  }
                }}
                style={{ width: '180px', cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="" disabled>Select a folder</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Create New Folder...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', width: '180px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="New folder" 
                  value={invoice.category || ''} 
                  onChange={(e) => updateField('category', e.target.value)} 
                  autoFocus
                />
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setIsNewCategory(false); updateField('category', ''); }}>X</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className="input-group">
            <label>Vendor Name</label>
            <input type="text" className="input-field" value={invoice.vendor_name || ''} onChange={(e) => updateField('vendor_name', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Invoice Number</label>
            <input type="text" className="input-field" value={invoice.invoice_number || ''} onChange={(e) => updateField('invoice_number', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Date</label>
            <input type="date" className="input-field" value={invoice.date || ''} onChange={(e) => updateField('date', e.target.value)} />
          </div>
          <div className="input-group">
            <label>GSTIN</label>
            <input type="text" className="input-field" value={invoice.gstin || ''} onChange={(e) => updateField('gstin', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Total Amount (₹)</label>
            <input type="number" className="input-field" value={invoice.total_amount || ''} onChange={(e) => updateField('total_amount', parseFloat(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Line Items</h3>
          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={addLineItem}>
            <Plus size={16} /> Add Item
          </button>
        </div>
        <div className="table-container" style={{ marginBottom: '2rem' }}>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, index) => (
                <tr key={index}>
                  <td><input type="text" className="input-field" value={item.description || ''} onChange={(e) => updateLineItem(index, 'description', e.target.value)} style={{ padding: '0.5rem' }} /></td>
                  <td><input type="number" className="input-field" value={item.quantity || ''} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} style={{ padding: '0.5rem', width: '80px' }} /></td>
                  <td><input type="number" className="input-field" value={item.unit_price || ''} onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)} style={{ padding: '0.5rem', width: '100px' }} /></td>
                  <td style={{ verticalAlign: 'middle' }}>₹{item.total}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem', color: 'var(--danger)', background: 'transparent', border: 'none' }} onClick={() => removeLineItem(index)} title="Remove Item">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;

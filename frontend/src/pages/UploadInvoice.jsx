import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { UploadCloud, Check, Save, Download, AlertTriangle, ScanLine, Activity, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadInvoice = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scanPhraseIndex, setScanPhraseIndex] = useState(0);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [limits, setLimits] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const limitsRes = await api.get('/limits');
        setLimits(limitsRes.data);
        const catRes = await api.get('/categories');
        setCategories(catRes.data);
      } catch (err) {
        console.error("Failed to fetch limits/categories", err);
      }
    };
    fetchInitialData();
  }, []);

  const scanningPhrases = [
    "Scanning document...", 
    "Extracting text with AI...", 
    "Identifying Line Items...", 
    "Calculating Totals...",
    "Verifying fields..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setScanPhraseIndex(0);
      interval = setInterval(() => {
        setScanPhraseIndex(prev => (prev + 1) % scanningPhrases.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setRateLimitError(false);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Initialize category to empty string for the UI if it's "Uncategorized"
      const data = response.data;
      if (data.category === "Uncategorized") data.category = "";
      setExtractedData(data);
      // Refresh limits
      api.get('/limits').then(res => setLimits(res.data)).catch(console.error);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 429) {
        setRateLimitError(true);
      } else {
        alert('Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Provide default category if empty
      const payload = {
        ...extractedData,
        category: extractedData.category || "Uncategorized"
      };
      await api.put(`/invoices/${extractedData.id}`, payload);
      alert('Invoice validated and saved successfully!');
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadJson = () => {
    const tallyData = {
      TallyMessage: {
        Voucher: {
          Date: extractedData.date,
          PartyName: extractedData.vendor_name,
          VoucherNumber: extractedData.invoice_number,
          Amount: extractedData.total_amount,
          GSTIN: extractedData.gstin,
          Category: extractedData.category || "Uncategorized",
          LedgerEntries: extractedData.line_items.map(item => ({
            LedgerName: "Purchase A/C",
            Amount: item.total
          }))
        }
      }
    };
    
    const blob = new Blob([JSON.stringify(tallyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally_import_${extractedData.invoice_number}.json`;
    a.click();
  };

  const updateField = (field, value) => {
    setExtractedData({ ...extractedData, [field]: value });
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...extractedData.line_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = parseFloat(updatedItems[index].quantity) || 0;
      const p = parseFloat(updatedItems[index].unit_price) || 0;
      updatedItems[index].total = parseFloat((q * p).toFixed(2));
    }
    setExtractedData({ ...extractedData, line_items: updatedItems });
  };

  const removeLineItem = (index) => {
    const updatedItems = extractedData.line_items.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, line_items: updatedItems });
  };

  const addLineItem = () => {
    const updatedItems = [...extractedData.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }];
    setExtractedData({ ...extractedData, line_items: updatedItems });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Upload Invoice</h1>
        {limits && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={`badge ${limits.minute_remaining > 5 ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={14} /> Minute Quota: {limits.minute_remaining} left
            </div>
            <div className={`badge ${limits.daily_remaining > 100 ? 'badge-primary' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={14} /> Daily Quota: {limits.daily_remaining} left
            </div>
          </div>
        )}
      </div>
      
      {rateLimitError && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle size={20} /> <strong>API Rate Limit Exhausted.</strong> Please wait a moment and try again.
        </div>
      )}

      {!extractedData ? (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="scanner-animation" style={{ marginBottom: '2rem', position: 'relative' }}>
                <ScanLine size={64} color="var(--primary)" className="pulse-icon" />
                <div className="scan-bar"></div>
              </div>
              <h3 className="fade-text" style={{ minHeight: '2rem' }}>{scanningPhrases[scanPhraseIndex]}</h3>
              <p style={{ color: 'var(--text-muted)' }}>This usually takes 2-4 seconds.</p>
            </div>
          ) : (
            <>
              <div 
                style={{ 
                  border: '2px dashed var(--surface-border)', 
                  borderRadius: '12px', 
                  padding: '3rem 2rem',
                  marginBottom: '1.5rem',
                  background: 'rgba(15, 23, 42, 0.4)'
                }}
              >
                <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h3>Drag & Drop your invoice here</h3>
                <p style={{ marginBottom: '1.5rem' }}>Supports PDF, JPG, PNG up to 10MB</p>
                
                <input 
                  type="file" 
                  id="fileInput" 
                  style={{ display: 'none' }} 
                  onChange={(e) => setFile(e.target.files[0])} 
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <button className="btn btn-secondary" onClick={() => document.getElementById('fileInput').click()}>
                  Browse Files
                </button>
                {file && <p style={{ marginTop: '1rem', color: 'var(--success)' }}><Check size={16}/> {file.name}</p>}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }} 
                onClick={handleUpload}
                disabled={!file || loading}
              >
                Process Invoice
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Extracted Data Verification</h2>
            <div className={`badge ${extractedData.confidence_score > 0.8 ? 'badge-success' : 'badge-warning'}`}>
              AI Confidence: {(extractedData.confidence_score * 100).toFixed(0)}%
            </div>
          </div>

          {extractedData.confidence_score < 0.8 && (
            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: '8px', color: 'var(--warning)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertTriangle size={20} /> Low confidence extraction. Please verify all fields carefully.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div className="input-group">
              <label>Vendor Name</label>
              <input type="text" className="input-field" value={extractedData.vendor_name || ''} onChange={(e) => updateField('vendor_name', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Invoice Number</label>
              <input type="text" className="input-field" value={extractedData.invoice_number || ''} onChange={(e) => updateField('invoice_number', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Date</label>
              <input type="date" className="input-field" value={extractedData.date || ''} onChange={(e) => updateField('date', e.target.value)} />
            </div>
            <div className="input-group">
              <label>GSTIN</label>
              <input type="text" className="input-field" value={extractedData.gstin || ''} onChange={(e) => updateField('gstin', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Total Amount (₹)</label>
              <input type="number" className="input-field" value={extractedData.total_amount || ''} onChange={(e) => updateField('total_amount', parseFloat(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Folder / Category</label>
              {!isNewCategory ? (
                <select 
                  className="input-field" 
                  value={extractedData.category || ''} 
                  onChange={(e) => {
                    if (e.target.value === "ADD_NEW") {
                      setIsNewCategory(true);
                      updateField('category', '');
                    } else {
                      updateField('category', e.target.value);
                    }
                  }}
                  style={{ cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="" disabled>Select a folder</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Create New Folder...</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="New folder name" 
                    value={extractedData.category || ''} 
                    onChange={(e) => updateField('category', e.target.value)} 
                    autoFocus
                  />
                  <button className="btn btn-secondary" onClick={() => { setIsNewCategory(false); updateField('category', ''); }}>X</button>
                </div>
              )}
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
                {extractedData.line_items.map((item, index) => (
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setExtractedData(null)}>Cancel</button>
            <button className="btn btn-secondary" onClick={handleDownloadJson} style={{ color: 'var(--success)' }}>
              <Download size={18} /> Export for Tally
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadInvoice;

'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, MapPin, Trash2 } from 'lucide-react';
import { warehousesApi } from '@/lib/api';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWHForm, setShowWHForm] = useState(false);
  const [whForm, setWhForm] = useState({ name:'', code:'', address:'' });
  const [selectedWH, setSelectedWH] = useState<any>(null);
  const [locForm, setLocForm] = useState({ name:'', type:'STOCK' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res: any = await warehousesApi.list();
    setWarehouses(res.data || []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddWH = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await warehousesApi.create(whForm);
      setWhForm({ name:'', code:'', address:'' }); setShowWHForm(false); load();
    } catch(err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await warehousesApi.addLocation(selectedWH.id, locForm);
      setLocForm({ name:'', type:'STOCK' });
      // Refresh selected WH detail
      const res: any = await warehousesApi.get(selectedWH.id);
      setSelectedWH(res.data);
      load();
    } catch(err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteLoc = async (lid: string) => {
    if (!confirm('Deactivate this location?')) return;
    await warehousesApi.deleteLocation(lid);
    const res: any = await warehousesApi.get(selectedWH.id);
    setSelectedWH(res.data); load();
  };

  const handleDeleteWH = async (id: string) => {
    if (!confirm('Deactivate this warehouse?')) return;
    await warehousesApi.delete(id); setSelectedWH(null); load();
  };

  const selectWH = async (wh: any) => {
    const res: any = await warehousesApi.get(wh.id);
    setSelectedWH(res.data);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="page-subtitle">Manage warehouses and stock locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowWHForm(v => !v)}>
          <Plus size={15}/>Add Warehouse
        </button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error mb-4">{error}</div>}

        {showWHForm && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>New Warehouse</h3>
            <form onSubmit={handleAddWH}>
              <div className="form-row" style={{ marginBottom:12 }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" required value={whForm.name}
                    onChange={e => setWhForm(p=>({...p,name:e.target.value}))} placeholder="Main Warehouse" />
                </div>
                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input className="form-input" required value={whForm.code}
                    onChange={e => setWhForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="WH-MAIN" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={whForm.address}
                  onChange={e => setWhForm(p=>({...p,address:e.target.value}))} placeholder="123 Industrial Road" />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowWHForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20 }}>
          {/* Warehouses list */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {loading ? <div className="page-loading"><div className="spinner"/></div> : (
              warehouses.map((wh: any) => (
                <div key={wh.id} onClick={() => selectWH(wh)}
                  className="card card-sm"
                  style={{
                    cursor:'pointer',
                    border: selectedWH?.id === wh.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                    transition:'all var(--transition)',
                  }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'var(--primary-dim)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                      <Building2 size={16} color="var(--primary)" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{wh.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'monospace' }}>{wh.code}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                        <MapPin size={10} style={{ display:'inline', marginRight:3 }}/>{wh.address || 'No address'}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{wh.location_count} location{wh.location_count!==1?'s':''}</div>
                    </div>
                    <button className="btn btn-danger btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); handleDeleteWH(wh.id); }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))
            )}
            {warehouses.length === 0 && !loading && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:30, fontSize:13 }}>
                No warehouses yet. Add one above.
              </div>
            )}
          </div>

          {/* Selected warehouse locations */}
          {selectedWH ? (
            <div>
              <div className="card" style={{ marginBottom:16 }}>
                <div className="section-header">
                  <h3 style={{ fontSize:15, fontWeight:600 }}>Locations — {selectedWH.name}</h3>
                </div>
                <div className="table-wrap" style={{ marginBottom:14 }}>
                  <table>
                    <thead><tr><th>Location Name</th><th>Type</th><th></th></tr></thead>
                    <tbody>
                      {(selectedWH.locations || []).map((l: any) => (
                        <tr key={l.id}>
                          <td style={{ fontWeight:500 }}>{l.name}</td>
                          <td><span className={`badge badge-${l.type.toLowerCase()}`}>{l.type}</span></td>
                          <td>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteLoc(l.id)}>
                              <Trash2 size={12}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!(selectedWH.locations?.length) && (
                        <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>No locations yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.05em' }}>Add Location</h4>
                <form onSubmit={handleAddLocation}>
                  <div style={{ display:'flex', gap:10 }}>
                    <input className="form-input" required value={locForm.name}
                      onChange={e => setLocForm(p=>({...p,name:e.target.value}))} placeholder="Location name (e.g. Rack A)" style={{ flex:1 }} />
                    <select className="form-input" value={locForm.type}
                      onChange={e => setLocForm(p=>({...p,type:e.target.value}))} style={{ width:120 }}>
                      <option value="STOCK">STOCK</option>
                      <option value="VENDOR">VENDOR</option>
                      <option value="CUSTOMER">CUSTOMER</option>
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Plus size={14}/>{saving ? '…' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'var(--text-muted)', fontSize:13 }}>
              ← Select a warehouse to manage its locations
            </div>
          )}
        </div>
      </div>
    </>
  );
}

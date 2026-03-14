'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { categoriesApi } from '@/lib/api';

export default function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res: any = await categoriesApi.list();
    setCats(res.data || []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setAdding(true);
    try {
      await categoriesApi.create({ name, description: desc });
      setName(''); setDesc(''); load();
    } catch(err: any) { setError(err.message); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await categoriesApi.delete(id); load(); }
    catch(err: any) { alert(err.message); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize products into categories</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
          {/* Table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {loading ? <div className="page-loading"><div className="spinner"/></div> : (
              <table>
                <thead><tr><th>Name</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {cats.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                      No categories yet
                    </td></tr>
                  ) : cats.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:28, height:28, background:'var(--primary-dim)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Tag size={13} color="var(--primary)" />
                          </div>
                          <span style={{ fontWeight:500 }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ color:'var(--text-muted)', fontSize:12 }}>{c.description || '—'}</td>
                      <td>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)}>
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add form */}
          <div className="card">
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Add Category</h3>
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" required value={name}
                  onChange={e => setName(e.target.value)} placeholder="e.g. Raw Materials" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={desc}
                  onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                <Plus size={15}/>{adding ? 'Adding…' : 'Add Category'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

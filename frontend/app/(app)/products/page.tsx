'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { productsApi, categoriesApi, warehousesApi } from '@/lib/api';

function Modal({ title, onClose, children }: any) {
  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0) return <span className="badge badge-canceled">Out of Stock</span>;
  if (stock <= minStock) return <span className="badge badge-waiting">Low Stock</span>;
  return <span className="badge badge-done">In Stock</span>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name:'', sku:'', category_id:'', uom:'Units', min_stock:0,
    description:'', initial_quantity:'', initial_location_id:''
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (catFilter) params.set('category', catFilter);
    if (lowStockFilter) params.set('lowStock', 'true');
    const res: any = await productsApi.list(params.toString() ? '?' + params : '');
    setProducts(res.data || []);
    setLoading(false);
  }, [search, catFilter, lowStockFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoriesApi.list().then((r: any) => setCategories(r.data || []));
    warehousesApi.allLocations().then((r: any) =>
      setLocations((r.data || []).filter((l: any) => l.type === 'STOCK'))
    );
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name:'', sku:'', category_id:'', uom:'Units', min_stock:0, description:'', initial_quantity:'', initial_location_id:'' });
    setError(''); setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditItem(p);
    setForm({ name:p.name, sku:p.sku, category_id:p.category_id, uom:p.uom, min_stock:p.min_stock, description:p.description||'', initial_quantity:'', initial_location_id:'' });
    setError(''); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (editItem) {
        await productsApi.update(editItem.id, form);
      } else {
        await productsApi.create({
          ...form, min_stock: Number(form.min_stock),
          initial_quantity: form.initial_quantity ? Number(form.initial_quantity) : undefined,
          initial_location_id: form.initial_location_id || undefined,
        });
      }
      setShowModal(false); load();
    } catch(err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this product?')) return;
    await productsApi.delete(id); load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/>New Product</button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <div style={{ position:'relative', flex:1, maxWidth:300 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input className="filter-input" placeholder="Search name or SKU…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:32, width:'100%' }} />
          </div>
          <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', color:'var(--text-muted)' }}>
            <input type="checkbox" checked={lowStockFilter}
              onChange={e => setLowStockFilter(e.target.checked)} />
            Low Stock Only
          </label>
        </div>

        {loading ? <div className="page-loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Product</th><th>SKU</th><th>Category</th>
                <th>UOM</th><th>Total Stock</th><th>Min Stock</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                    <Package size={32} style={{ opacity:.3, display:'block', margin:'0 auto 8px' }} />
                    No products found
                  </td></tr>
                ) : products.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight:500 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{p.description}</div>}
                    </td>
                    <td><span style={{ fontFamily:'monospace', fontSize:12, background:'var(--bg-input)', padding:'2px 6px', borderRadius:4 }}>{p.sku}</span></td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{p.category_name}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{p.uom}</td>
                    <td style={{ fontWeight:600 }}>{Number(p.total_stock).toLocaleString()}</td>
                    <td style={{ color:'var(--text-muted)' }}>{p.min_stock}</td>
                    <td><StatusBadge stock={Number(p.total_stock)} minStock={Number(p.min_stock)} /></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={14}/></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editItem ? 'Edit Product' : 'New Product'} onClose={() => setShowModal(false)}>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="form-row" style={{ marginBottom:14 }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" required value={form.name}
                  onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Steel Rods 10mm" />
              </div>
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-input" required value={form.sku}
                  onChange={e => setForm(p=>({...p,sku:e.target.value}))} placeholder="e.g. SKU-STL-001" />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom:14 }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input" required value={form.category_id}
                  onChange={e => setForm(p=>({...p,category_id:e.target.value}))}>
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <input className="form-input" value={form.uom}
                  onChange={e => setForm(p=>({...p,uom:e.target.value}))} placeholder="Units, kg, pcs…" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label">Min Stock (Reorder Point)</label>
              <input type="number" className="form-input" min={0} value={form.min_stock}
                onChange={e => setForm(p=>({...p,min_stock:Number(e.target.value)}))} />
            </div>
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description}
                onChange={e => setForm(p=>({...p,description:e.target.value}))} />
            </div>
            {!editItem && (
              <div className="form-row" style={{ marginBottom:14, padding:'14px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                <div className="form-group">
                  <label className="form-label">Initial Stock (optional)</label>
                  <input type="number" className="form-input" min={0} value={form.initial_quantity}
                    onChange={e => setForm(p=>({...p,initial_quantity:e.target.value}))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <select className="form-input" value={form.initial_location_id}
                    onChange={e => setForm(p=>({...p,initial_location_id:e.target.value}))}>
                    <option value="">Select location</option>
                    {locations.map((l: any) => <option key={l.id} value={l.id}>{l.warehouse_name} – {l.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" style={{width:14,height:14}}/> Saving…</> : 'Save Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

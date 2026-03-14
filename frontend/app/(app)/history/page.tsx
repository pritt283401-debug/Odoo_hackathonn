'use client';
import { useEffect, useState, useCallback } from 'react';
import { History, Filter } from 'lucide-react';
import { ledgerApi, productsApi, warehousesApi } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  RECEIPT:'Receipt', DELIVERY:'Delivery', TRANSFER:'Transfer', ADJUSTMENT:'Adjustment'
};

export default function HistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ product_id:'', location_id:'', type:'', from_date:'', to_date:'' });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k,v]) => { if(v) params.set(k,v); });
    const res: any = await ledgerApi.list(params.toString() ? '?'+params : '');
    setRows(res.data || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productsApi.list('?limit=200').then((r: any) => setProducts(r.data || []));
    warehousesApi.allLocations().then((r: any) => setLocations(r.data || []));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Move History</h1>
          <p className="page-subtitle">Complete stock movement audit trail</p>
        </div>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div className="card card-sm" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Filter size={14} color="var(--text-muted)"/><span style={{ fontSize:13, fontWeight:500, color:'var(--text-muted)' }}>Filters</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
            <select className="filter-select" value={filters.product_id}
              onChange={e => setFilters(p => ({...p, product_id:e.target.value}))}>
              <option value="">All Products</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="filter-select" value={filters.location_id}
              onChange={e => setFilters(p => ({...p, location_id:e.target.value}))}>
              <option value="">All Locations</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.warehouse_name ? `${l.warehouse_name} – ` : ''}{l.name}</option>)}
            </select>
            <select className="filter-select" value={filters.type}
              onChange={e => setFilters(p => ({...p, type:e.target.value}))}>
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" className="filter-input" value={filters.from_date}
              onChange={e => setFilters(p => ({...p, from_date:e.target.value}))} />
            <input type="date" className="filter-input" value={filters.to_date}
              onChange={e => setFilters(p => ({...p, to_date:e.target.value}))} />
            <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ product_id:'', location_id:'', type:'', from_date:'', to_date:'' })}>
              Clear All
            </button>
          </div>
        </div>

        {loading ? <div className="page-loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Date/Time</th><th>Product</th><th>Location</th>
                <th>Type</th><th>Change</th><th>After</th><th>Reference</th><th>By</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                    <History size={32} style={{ opacity:.3, display:'block', margin:'0 auto 8px' }}/>
                    No movements yet. Validate operations to see history here.
                  </td></tr>
                ) : rows.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight:500, fontSize:13 }}>{r.product_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{r.sku}</div>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {r.warehouse_name && <span style={{ color:'var(--text-muted)' }}>{r.warehouse_name} – </span>}
                      {r.location_name}
                    </td>
                    <td><span className={`badge badge-${r.type.toLowerCase()}`}>{TYPE_LABELS[r.type]}</span></td>
                    <td>
                      <span style={{ fontWeight:700, fontSize:14, color: r.quantity_change > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {r.quantity_change > 0 ? '+' : ''}{Number(r.quantity_change).toLocaleString()} {r.uom}
                      </span>
                    </td>
                    <td style={{ fontWeight:500 }}>{Number(r.quantity_after).toLocaleString()} {r.uom}</td>
                    <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--primary)' }}>{r.reference}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{r.performed_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
